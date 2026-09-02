"""
services/chat_db.py

Responsibilities:
  - Async CRUD operations for chat conversations and messages
  - Database queries optimized with proper indexing
  - Transaction management for data consistency

Key Operations:
  - Create conversations and append messages
  - Fetch user conversations (ordered by recency)
  - Retrieve full conversation history with all messages
  - Delete conversations (cascade delete to messages)
"""

from typing import Optional, List
from sqlalchemy import select, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.chat import Conversation, Message
from schemas.chat import (
    CreateConversationRequest,
    AppendMessageRequest,
    ConversationResponse,
    ConversationListItemResponse,
    MessageResponse,
)


# ============================================================================
# CONVERSATION OPERATIONS
# ============================================================================

async def create_conversation(
    session: AsyncSession,
    user_id: int,
    title: Optional[str] = None,
) -> Conversation:
    """
    Create a new conversation for a user.
    
    Args:
        session: The async SQLAlchemy session.
        user_id: The ID of the user creating the conversation.
        title: Optional custom title. Defaults to "New Conversation" if not provided.
    
    Returns:
        The newly created Conversation instance (with ID populated).
    
    Raises:
        sqlalchemy.exc.IntegrityError: If the user_id is invalid or database constraint violated.
    """
    conversation = Conversation(
        user_id=user_id,
        title=title or "New Conversation",
    )
    session.add(conversation)
    await session.flush()  # Populate ID without committing
    return conversation


async def get_user_conversations(
    session: AsyncSession,
    user_id: int,
    limit: int = 50,
    offset: int = 0,
) -> List[ConversationListItemResponse]:
    """
    Fetch all conversations for a user, ordered by most recent first.
    
    Args:
        session: The async SQLAlchemy session.
        user_id: The ID of the user.
        limit: Maximum number of conversations to return (default: 50).
        offset: Number of conversations to skip (default: 0, for pagination).
    
    Returns:
        A list of ConversationListItemResponse objects (without message history).
    """
    query = select(Conversation).where(
        Conversation.user_id == user_id
    ).order_by(
        desc(Conversation.created_at)
    ).limit(
        limit
    ).offset(
        offset
    )
    
    result = await session.execute(query)
    conversations = result.scalars().all()
    
    return [
        ConversationListItemResponse.model_validate(conv)
        for conv in conversations
    ]


async def get_conversation_by_id(
    session: AsyncSession,
    conversation_id: int,
    user_id: Optional[int] = None,
) -> Optional[ConversationResponse]:
    """
    Fetch a single conversation with all its messages.
    
    Args:
        session: The async SQLAlchemy session.
        conversation_id: The ID of the conversation to fetch.
        user_id: Optional user ID to verify ownership (for security).
    
    Returns:
        A ConversationResponse with full message history, or None if not found.
    """
    query = select(Conversation).where(
        Conversation.id == conversation_id
    )
    
    # Add user ownership check if provided
    if user_id is not None:
        query = query.where(Conversation.user_id == user_id)
    
    # Eagerly load messages to avoid N+1 queries
    query = query.options(selectinload(Conversation.messages))
    
    result = await session.execute(query)
    conversation = result.scalar_one_or_none()
    
    if conversation is None:
        return None
    
    # Sort messages by creation time (ascending)
    sorted_messages = sorted(conversation.messages, key=lambda m: m.created_at)
    conversation.messages = sorted_messages
    
    return ConversationResponse.model_validate(conversation)


async def get_conversation_history(
    session: AsyncSession,
    conversation_id: int,
    user_id: Optional[int] = None,
) -> Optional[ConversationResponse]:
    """
    Alias for get_conversation_by_id with focus on message history retrieval.
    
    Returns full conversation history (all messages) ordered by creation time.
    """
    return await get_conversation_by_id(session, conversation_id, user_id)


async def delete_conversation(
    session: AsyncSession,
    conversation_id: int,
    user_id: Optional[int] = None,
) -> bool:
    """
    Delete a conversation and cascade-delete all its messages.
    
    Args:
        session: The async SQLAlchemy session.
        conversation_id: The ID of the conversation to delete.
        user_id: Optional user ID to verify ownership (for security).
    
    Returns:
        True if the conversation was deleted, False if not found.
    """
    query = select(Conversation).where(
        Conversation.id == conversation_id
    )
    
    if user_id is not None:
        query = query.where(Conversation.user_id == user_id)
    
    result = await session.execute(query)
    conversation = result.scalar_one_or_none()
    
    if conversation is None:
        return False
    
    await session.delete(conversation)
    return True


# ============================================================================
# MESSAGE OPERATIONS
# ============================================================================

async def append_message(
    session: AsyncSession,
    conversation_id: int,
    role: str,
    content: str,
) -> Message:
    """
    Append a message to an existing conversation.
    
    Args:
        session: The async SQLAlchemy session.
        conversation_id: The ID of the conversation.
        role: The role of the sender ('user', 'assistant', 'system').
        content: The message content.
    
    Returns:
        The newly created Message instance (with ID populated).
    
    Raises:
        sqlalchemy.exc.IntegrityError: If conversation_id doesn't exist.
    """
    message = Message(
        conversation_id=conversation_id,
        role=role,
        content=content,
    )
    session.add(message)
    await session.flush()  # Populate ID without committing
    return message


async def get_conversation_messages(
    session: AsyncSession,
    conversation_id: int,
    limit: int = 1000,
    offset: int = 0,
) -> List[MessageResponse]:
    """
    Fetch messages for a conversation, ordered by creation time.
    
    The composite index on (conversation_id, created_at) optimizes this query.
    
    Args:
        session: The async SQLAlchemy session.
        conversation_id: The ID of the conversation.
        limit: Maximum number of messages to return (default: 1000).
        offset: Number of messages to skip (default: 0, for pagination).
    
    Returns:
        A list of MessageResponse objects ordered by created_at (ascending).
    """
    query = select(Message).where(
        Message.conversation_id == conversation_id
    ).order_by(
        Message.created_at
    ).limit(
        limit
    ).offset(
        offset
    )
    
    result = await session.execute(query)
    messages = result.scalars().all()
    
    return [
        MessageResponse.model_validate(msg)
        for msg in messages
    ]


async def get_message_by_id(
    session: AsyncSession,
    message_id: int,
) -> Optional[MessageResponse]:
    """
    Fetch a single message by ID.
    
    Args:
        session: The async SQLAlchemy session.
        message_id: The ID of the message.
    
    Returns:
        A MessageResponse, or None if not found.
    """
    query = select(Message).where(Message.id == message_id)
    result = await session.execute(query)
    message = result.scalar_one_or_none()
    
    if message is None:
        return None
    
    return MessageResponse.model_validate(message)


async def delete_message(
    session: AsyncSession,
    message_id: int,
) -> bool:
    """
    Delete a single message from a conversation.
    
    Args:
        session: The async SQLAlchemy session.
        message_id: The ID of the message to delete.
    
    Returns:
        True if the message was deleted, False if not found.
    """
    query = select(Message).where(Message.id == message_id)
    result = await session.execute(query)
    message = result.scalar_one_or_none()
    
    if message is None:
        return False
    
    await session.delete(message)
    return True


# ============================================================================
# BATCH OPERATIONS
# ============================================================================

async def save_conversation_with_messages(
    session: AsyncSession,
    user_id: int,
    title: Optional[str],
    messages_data: List[dict],
) -> Conversation:
    """
    Create a conversation and populate it with multiple messages in one operation.
    
    Useful for initializing conversations with existing message history.
    
    Args:
        session: The async SQLAlchemy session.
        user_id: The ID of the user creating the conversation.
        title: Optional conversation title.
        messages_data: List of dicts with keys: {'role', 'content'}.
    
    Returns:
        The created Conversation with its messages populated.
    
    Example:
        >>> messages = [
        ...     {'role': 'user', 'content': 'Hello'},
        ...     {'role': 'assistant', 'content': 'Hi there!'},
        ... ]
        >>> conv = await save_conversation_with_messages(
        ...     session, user_id=1, title="Chat", messages_data=messages
        ... )
    """
    # Create the conversation
    conversation = await create_conversation(session, user_id, title)
    
    # Append all messages
    for msg_data in messages_data:
        message = Message(
            conversation_id=conversation.id,
            role=msg_data["role"],
            content=msg_data["content"],
        )
        session.add(message)
    
    await session.flush()  # Populate all IDs
    return conversation
