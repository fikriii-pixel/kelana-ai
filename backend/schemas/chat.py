from datetime import datetime
from typing import List
from pydantic import BaseModel, Field


# ============================================================================
# REQUEST SCHEMAS
# ============================================================================

class CreateConversationRequest(BaseModel):
    """
    Request schema for creating a new conversation.
    
    Attributes:
        title: Optional custom title for the conversation. If not provided, 
               defaults to "New Conversation" in the database.
    """
    title: str | None = Field(default=None, max_length=256, description="Optional conversation title")


class AppendMessageRequest(BaseModel):
    """
    Request schema for adding a message to a conversation.
    
    Attributes:
        role: The role of the message sender ('user', 'assistant', or 'system').
        content: The text content of the message.
    """
    role: str = Field(description="Message sender role: 'user', 'assistant', or 'system'")
    content: str = Field(min_length=1, description="Message content")


# ============================================================================
# RESPONSE SCHEMAS
# ============================================================================

class MessageResponse(BaseModel):
    """
    Response schema for a single message.
    
    Attributes:
        id: Unique message ID.
        conversation_id: ID of the parent conversation.
        role: The role of the message sender.
        content: The text content of the message.
        created_at: Timestamp when the message was created (UTC).
    """
    id: int
    conversation_id: int
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationResponse(BaseModel):
    """
    Response schema for a conversation with its messages.
    
    Attributes:
        id: Unique conversation ID.
        user_id: ID of the user who owns this conversation.
        title: The conversation title.
        created_at: Timestamp when the conversation was created (UTC).
        messages: List of messages in this conversation.
    """
    id: int
    user_id: int
    title: str
    created_at: datetime
    messages: List[MessageResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class ConversationListItemResponse(BaseModel):
    """
    Response schema for a conversation in a list (without full message history).
    
    Used for listing user conversations without loading all messages.
    
    Attributes:
        id: Unique conversation ID.
        user_id: ID of the user who owns this conversation.
        title: The conversation title.
        created_at: Timestamp when the conversation was created (UTC).
    """
    id: int
    user_id: int
    title: str
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationHistoryResponse(BaseModel):
    """
    Response schema for retrieving full conversation history.
    
    Includes all messages sorted by creation time.
    
    Attributes:
        id: Unique conversation ID.
        title: The conversation title.
        messages: List of messages ordered by created_at (ascending).
    """
    id: int
    title: str
    messages: List[MessageResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True
