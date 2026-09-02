"""
routers/conversations.py

REST API endpoints for managing user conversations.

Endpoints:
  POST   /api/v1/conversations      — Create a new conversation
  GET    /api/v1/conversations      — List all conversations for the authenticated user
    DELETE /api/v1/conversations/{id} — Delete a conversation and its messages
"""

from fastapi import APIRouter, status, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List

from database import SessionLocal
from models.chat import Conversation, Message
from dependencies import get_current_user, get_db
from models.user import User

router = APIRouter(prefix="/api/v1/conversations", tags=["conversations"])


# ============================================================================
# SCHEMAS
# ============================================================================

class CreateConversationRequest(BaseModel):
    """Request payload for creating a new conversation."""
    title: str | None = Field(
        default=None,
        max_length=256,
        description="Optional custom title for the conversation"
    )


class CreateConversationResponse(BaseModel):
    """Response payload when a conversation is created."""
    conversation_id: int = Field(description="ID of the newly created conversation")


class MessageInConversation(BaseModel):
    """A single message within a conversation."""
    id: int
    role: str = Field(description="Message sender role: 'user', 'assistant', or 'system'")
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationListItem(BaseModel):
    """A conversation item in the list response."""
    id: int = Field(description="Unique conversation ID")
    title: str = Field(description="Conversation title")
    created_at: datetime = Field(description="Timestamp when the conversation was created (UTC)")

    class Config:
        from_attributes = True


class ConversationListResponse(BaseModel):
    """Response payload for listing conversations."""
    conversations: List[ConversationListItem] = Field(
        description="List of conversations ordered by most recent first"
    )
    total: int = Field(description="Total number of conversations for this user")


class ConversationUpdate(BaseModel):
    """Request payload for renaming an existing conversation."""
    title: str = Field(
        min_length=1,
        max_length=256,
        description="Updated conversation title"
    )


class ConversationUpdateResponse(BaseModel):
    """Response payload for an updated conversation."""
    id: int = Field(description="Conversation ID")
    title: str = Field(description="Updated conversation title")
    created_at: datetime = Field(description="Timestamp when the conversation was created")

    class Config:
        from_attributes = True


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post(
    "",
    response_model=CreateConversationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new conversation",
    description="Creates a new conversation for the authenticated user and returns the conversation ID.",
)
def create_conversation(
    request: CreateConversationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CreateConversationResponse:
    """
    Create a new conversation for the authenticated user.

    Args:
        request: The create conversation request payload.
        current_user: The authenticated user (injected via dependency).
        db: The SQLAlchemy session (injected via dependency).

    Returns:
        CreateConversationResponse with the new conversation ID.

    Raises:
        HTTPException: If database operation fails.
    """
    try:
        # Create conversation with optional title
        conversation = Conversation(
            user_id=current_user.id,
            title=request.title or "New Conversation",
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

        return CreateConversationResponse(conversation_id=conversation.id)

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create conversation: {str(e)}",
        )


@router.get(
    "",
    response_model=ConversationListResponse,
    status_code=status.HTTP_200_OK,
    summary="List user's conversations",
    description="Returns all conversations for the authenticated user, ordered by most recent first.",
)
def list_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 50,
    offset: int = 0,
) -> ConversationListResponse:
    """
    Fetch all conversations for the authenticated user, ordered by most recent first.

    Args:
        current_user: The authenticated user (injected via dependency).
        db: The SQLAlchemy session (injected via dependency).
        limit: Maximum number of conversations to return (default: 50).
        offset: Number of conversations to skip for pagination (default: 0).

    Returns:
        ConversationListResponse with list of conversations and total count.

    Raises:
        HTTPException: If database operation fails.
    """
    try:
        # Query conversations for the current user, ordered by newest first
        query = db.query(Conversation).filter(
            Conversation.user_id == current_user.id
        ).order_by(
            Conversation.created_at.desc()
        )

        # Get total count
        total = query.count()

        # Apply pagination
        conversations = query.limit(limit).offset(offset).all()

        # Convert to response models
        conversation_items = [
            ConversationListItem(
                id=conv.id,
                title=conv.title,
                created_at=conv.created_at,
            )
            for conv in conversations
        ]

        return ConversationListResponse(
            conversations=conversation_items,
            total=total,
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch conversations: {str(e)}",
        )


@router.patch(
    "/{conversation_id}",
    response_model=ConversationUpdateResponse,
    status_code=status.HTTP_200_OK,
    summary="Rename a conversation",
    description="Updates the title for a specific conversation owned by the authenticated user.",
)
def update_conversation(
    conversation_id: int,
    request: ConversationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ConversationUpdateResponse:
    """Rename an existing conversation if it belongs to the authenticated user."""
    try:
        conversation = db.query(Conversation).filter(
            Conversation.id == conversation_id
        ).first()

        if conversation is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Conversation {conversation_id} not found.",
            )

        if conversation.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to update this conversation.",
            )

        conversation.title = request.title.strip()
        db.commit()
        db.refresh(conversation)

        return ConversationUpdateResponse(
            id=conversation.id,
            title=conversation.title,
            created_at=conversation.created_at,
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to rename conversation: {str(e)}",
        )


@router.delete(
    "/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a conversation",
    description="Deletes a conversation owned by the authenticated user and all of its messages.",
)
def delete_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Delete an existing conversation if it belongs to the authenticated user."""
    try:
        conversation = db.query(Conversation).filter(
            Conversation.id == conversation_id
        ).first()

        if conversation is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Conversation {conversation_id} not found.",
            )

        if conversation.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to delete this conversation.",
            )

        db.delete(conversation)
        db.commit()

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete conversation: {str(e)}",
        )
