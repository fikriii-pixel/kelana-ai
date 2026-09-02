"""
routers/messages.py

REST API endpoint for managing messages within conversations.

The core orchestration endpoint `POST /api/v1/conversations/{conversation_id}/messages`
implements a 7-step backend-managed conversation pipeline:

1. Receive User Message: Extract content from request body and path parameter.
2. Save User Message to DB: Insert into messages table with role="user".
3. Load Previous Messages: Fetch last 10 messages for context window management.
4. Build Prompt: Format conversation history and inject RAG context.
5. Query Amazon Bedrock: Invoke Bedrock KB service for answer + sources.
6. Save AI Response to DB: Insert assistant response with role="assistant".
7. Return Response Payload: Status 200 OK with message details and sources.
"""

import logging
from typing import List
from datetime import datetime

from fastapi import APIRouter, status, Depends, HTTPException, Path
from pydantic import BaseModel
from sqlalchemy import desc
from sqlalchemy.orm import Session

from database import SessionLocal
from models.chat import Conversation, Message
from models.user import User
from dependencies import get_current_user, get_db
from schemas.message import MessageCreateRequest, MessageResponse
from services.kb_service import ask_knowledge_base
from services.prompt_builder import build_optimized_prompt

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/conversations", tags=["messages"])


# ============================================================================
# CONSTANTS & HELPERS
# ============================================================================

CONTEXT_WINDOW_LIMIT = 10  # Fetch last N messages for context


def _verify_conversation_ownership(
    conversation_id: int,
    user_id: int,
    db: Session,
) -> Conversation:
    """
    Verify that a conversation belongs to the given user.
    
    Args:
        conversation_id: The ID of the conversation.
        user_id: The ID of the user.
        db: SQLAlchemy session.
    
    Returns:
        The Conversation object if ownership is verified.
    
    Raises:
        HTTPException: 404 if conversation not found, 403 if owned by different user.
    """
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id
    ).first()
    
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation {conversation_id} not found.",
        )
    
    if conversation.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this conversation.",
        )
    
    return conversation


def _load_previous_messages(
    conversation_id: int,
    db: Session,
    limit: int = CONTEXT_WINDOW_LIMIT,
) -> List[Message]:
    """
    Fetch previous messages for a conversation, ordered by creation time.
    
    Args:
        conversation_id: The ID of the conversation.
        db: SQLAlchemy session.
        limit: Maximum number of messages to fetch (default: 10).
    
    Returns:
        List of Message objects ordered by created_at (ascending).
    """
    messages = db.query(Message).filter(
        Message.conversation_id == conversation_id
    ).order_by(
        Message.created_at.asc()
    ).limit(limit).all()
    
    return messages


# Note: Prompt building is now handled by services/prompt_builder.py
# The build_rag_prompt() function manages context windows and formatting.
# See usage in create_message() endpoint below.


def _generate_title_from_first_exchange(user_message: str) -> str:
    """
    Generate a concise conversation title from the first user message.
    
    Args:
        user_message: The first user message in the conversation.
    
    Returns:
        A title string (max 256 characters).
    """
    # Take first ~50 chars or first sentence
    if len(user_message) > 50:
        title = user_message[:50].strip() + "..."
    else:
        title = user_message.strip()
    
    return title[:256]


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post(
    "/{conversation_id}/messages",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Send message to conversation",
    description="""
    Send a user message to a conversation and receive an AI response.
    
    Implements a 7-step orchestration pipeline:
    1. Receive user message
    2. Save user message to DB
    3. Load previous messages (last 10)
    4. Build prompt with context
    5. Query AWS Bedrock Knowledge Base
    6. Save AI response to DB
    7. Return response with sources
    """,
)
def create_message(
    conversation_id: int = Path(..., gt=0, description="The conversation ID"),
    request: MessageCreateRequest = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageResponse:
    """
    Execute the full message orchestration pipeline.
    
    Steps:
    1. Verify conversation ownership
    2. Save user message to database
    3. Load previous messages for context
    4. Query Bedrock KB for answer + sources
    5. Save assistant response to database
    6. Auto-generate title if first message
    7. Return assistant message response
    
    Args:
        conversation_id: The ID of the conversation (path parameter).
        request: MessageCreateRequest with user content.
        current_user: Authenticated user (injected).
        db: SQLAlchemy session (injected).
    
    Returns:
        MessageResponse with the assistant's reply, sources, and metadata.
    
    Raises:
        HTTPException: 400 if request is invalid, 404 if conversation not found,
                      403 if unauthorized, 500 on database or Bedrock errors.
    """
    
    # ──────────────────────────────────────────────────────────────────────────
    # STEP 1: Receive User Message
    # ──────────────────────────────────────────────────────────────────────────
    
    if request is None or not request.content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Request body must include 'content' field.",
        )
    
    user_content = request.content.strip()
    
    # ──────────────────────────────────────────────────────────────────────────
    # Verify Conversation Ownership
    # ──────────────────────────────────────────────────────────────────────────
    
    conversation = _verify_conversation_ownership(
        conversation_id=conversation_id,
        user_id=current_user.id,
        db=db,
    )
    
    try:
        # ──────────────────────────────────────────────────────────────────────
        # STEP 2: Save User Message to DB
        # ──────────────────────────────────────────────────────────────────────
        
        user_message = Message(
            conversation_id=conversation_id,
            role="user",
            content=user_content,
        )
        db.add(user_message)
        db.commit()
        db.refresh(user_message)
        
        logger.info(
            f"Saved user message {user_message.id} to conversation {conversation_id}"
        )
        
        # ──────────────────────────────────────────────────────────────────────
        # STEP 3: Load Previous Messages (Backend History Orchestration)
        # ──────────────────────────────────────────────────────────────────────
        
        previous_messages = _load_previous_messages(
            conversation_id=conversation_id,
            db=db,
            limit=CONTEXT_WINDOW_LIMIT,
        )
        
        # Remove the user message we just added from the context
        # (so we don't duplicate it in the prompt)
        previous_messages = [m for m in previous_messages if m.id != user_message.id]
        
        logger.info(
            f"Loaded {len(previous_messages)} previous messages for context"
        )
        
        # ──────────────────────────────────────────────────────────────────────
        # STEP 4: Build Prompt with RAG Context
        # ──────────────────────────────────────────────────────────────────────
        
        # Query Bedrock KB for context
        logger.info(f"Querying Bedrock KB with user query: {user_content[:100]}...")
        
        kb_response = ask_knowledge_base(user_content)
        bedrock_answer = kb_response.get("answer", "")
        sources = kb_response.get("sources", [])
        
        logger.info(f"Bedrock KB returned {len(sources)} sources: {sources}")
        
        # Build the optimized prompt using the hybrid sliding-window + summary strategy
        # Older history is summarized to preserve memory without exploding token count.
        optimized_prompt = build_optimized_prompt(
            history=previous_messages,
            new_question=user_content,
            kb_context=bedrock_answer or "",
        )

        logger.debug(
            "Built optimized prompt payload with %s message entries for conversation %s",
            len(optimized_prompt),
            conversation_id,
        )
        
        # ──────────────────────────────────────────────────────────────────────
        # STEP 5: Query Amazon Bedrock (already done via ask_knowledge_base)
        # ──────────────────────────────────────────────────────────────────────
        # The ask_knowledge_base() function already queried Bedrock and returned
        # the answer. We use that answer as the assistant's response.
        
        assistant_content = bedrock_answer
        
        # ──────────────────────────────────────────────────────────────────────
        # STEP 6: Save AI Response to DB
        # ──────────────────────────────────────────────────────────────────────
        
        assistant_message = Message(
            conversation_id=conversation_id,
            role="assistant",
            content=assistant_content,
        )
        db.add(assistant_message)
        
        # Auto-generate conversation title if this is the first message exchange
        # (i.e., only 2 messages so far: user + assistant we're about to commit)
        if len(previous_messages) == 0:
            conversation.title = _generate_title_from_first_exchange(user_content)
            db.add(conversation)
            logger.info(f"Auto-generated title for conversation {conversation_id}: {conversation.title}")
        
        db.commit()
        db.refresh(assistant_message)
        
        logger.info(
            f"Saved assistant message {assistant_message.id} to conversation {conversation_id}"
        )
        
        # ──────────────────────────────────────────────────────────────────────
        # STEP 7: Return Response Payload
        # ──────────────────────────────────────────────────────────────────────
        
        return MessageResponse(
            id=assistant_message.id,
            conversation_id=conversation_id,
            role="assistant",
            content=assistant_content,
            sources=sources,
            created_at=assistant_message.created_at,
        )
    
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    
    except ValueError as ve:
        db.rollback()
        logger.error(f"Configuration error: {str(ve)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Service configuration error: {str(ve)}",
        )
    
    except RuntimeError as re:
        db.rollback()
        logger.error(f"Bedrock KB error: {str(re)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve context from knowledge base: {str(re)}",
        )
    
    except Exception as e:
        db.rollback()
        logger.exception(f"Unexpected error in message orchestration: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while processing your message.",
        )


# ============================================================================
# GET MESSAGES (FETCH CONVERSATION HISTORY)
# ============================================================================

@router.get(
    "/{conversation_id}/messages",
    response_model=List[MessageResponse],
    status_code=status.HTTP_200_OK,
    summary="Get conversation messages",
    description="""
    Fetch all messages from an existing conversation, ordered by creation time.
    
    Use this endpoint to load the chat history when resuming a conversation
    or switching between conversations.
    """,
)
def get_messages(
    conversation_id: int = Path(..., gt=0, description="The conversation ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[MessageResponse]:
    """
    Retrieve all messages for a conversation.
    
    Verifies that the conversation belongs to the authenticated user,
    then returns all messages ordered by creation time (ascending).
    
    Args:
        conversation_id: The ID of the conversation (path parameter).
        current_user: Authenticated user (injected).
        db: SQLAlchemy session (injected).
    
    Returns:
        List of MessageResponse objects ordered by created_at (ascending).
    
    Raises:
        HTTPException: 404 if conversation not found, 403 if unauthorized,
                      500 on database errors.
    """
    try:
        # ──────────────────────────────────────────────────────────────────────
        # Verify Conversation Ownership
        # ──────────────────────────────────────────────────────────────────────
        
        conversation = _verify_conversation_ownership(
            conversation_id=conversation_id,
            user_id=current_user.id,
            db=db,
        )
        
        # ──────────────────────────────────────────────────────────────────────
        # Fetch All Messages (Ordered by Creation Time)
        # ──────────────────────────────────────────────────────────────────────
        
        messages = db.query(Message).filter(
            Message.conversation_id == conversation_id
        ).order_by(
            Message.created_at.asc()
        ).all()
        
        logger.info(
            f"Fetched {len(messages)} messages from conversation {conversation_id}"
        )
        
        # ──────────────────────────────────────────────────────────────────────
        # Return Response
        # ──────────────────────────────────────────────────────────────────────
        
        return [
            MessageResponse(
                id=msg.id,
                conversation_id=msg.conversation_id,
                role=msg.role,
                content=msg.content,
                sources=[],  # Sources are only returned for new assistant messages
                created_at=msg.created_at,
            )
            for msg in messages
        ]
    
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    
    except Exception as e:
        logger.exception(f"Error fetching messages for conversation {conversation_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve conversation messages.",
        )
