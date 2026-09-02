"""
schemas/message.py

Pydantic schemas for message request and response payloads.
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class MessageCreateRequest(BaseModel):
    """
    Request payload for creating a message in a conversation.
    
    The user message content is sent to the backend, which orchestrates
    the full pipeline: save user message, query Bedrock KB, save assistant response.
    """
    content: str = Field(
        min_length=1,
        max_length=5000,
        description="The user's message content"
    )


class MessageResponse(BaseModel):
    """
    Response payload for a message (user or assistant).
    
    Attributes:
        id: Unique message ID.
        conversation_id: ID of the parent conversation.
        role: Message sender role ('user', 'assistant', or 'system').
        content: The text content of the message.
        sources: List of source document filenames (only for assistant messages).
        created_at: Timestamp when the message was created (UTC).
    """
    id: int = Field(description="Unique message ID")
    conversation_id: int = Field(description="Parent conversation ID")
    role: str = Field(description="Message sender role: 'user', 'assistant', or 'system'")
    content: str = Field(description="Message text content")
    sources: List[str] = Field(
        default_factory=list,
        description="Source document filenames (for assistant messages with KB context)"
    )
    created_at: datetime = Field(description="Timestamp when the message was created (UTC)")

    class Config:
        from_attributes = True


class ConversationMessageResponse(BaseModel):
    """
    Extended response that includes conversation context (for details endpoint).
    
    Attributes:
        id: Unique message ID.
        conversation_id: ID of the parent conversation.
        conversation_title: Title of the parent conversation.
        role: Message sender role.
        content: Message text content.
        sources: Source document filenames (for assistant messages).
        created_at: Timestamp when the message was created (UTC).
    """
    id: int
    conversation_id: int
    conversation_title: str = Field(description="Title of the parent conversation")
    role: str
    content: str
    sources: List[str] = Field(default_factory=list)
    created_at: datetime

    class Config:
        from_attributes = True
