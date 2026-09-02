from sqlalchemy import Column, BigInteger, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Conversation(Base):
    """
    Represents a chat conversation between a user and the assistant.
    
    Each conversation is linked to a specific user and contains multiple messages.
    Supports cascade deletion: removing a conversation removes all its messages.
    """
    __tablename__ = "conversations"

    id = Column(BigInteger, primary_key=True, autoincrement=True, doc="Unique conversation ID")
    user_id = Column(
        BigInteger,
        nullable=False,
        index=True,
        doc="Foreign key reference to the user who owns this conversation"
    )
    title = Column(
        String(256),
        default="New Conversation",
        nullable=False,
        doc="User-friendly title for the conversation"
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        doc="Timestamp when the conversation was created (UTC)"
    )

    # One Conversation → Many Messages; deleting a conversation cascades to its messages
    messages = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
        lazy="select",
        doc="List of messages in this conversation"
    )

    def __repr__(self) -> str:
        return f"<Conversation(id={self.id}, user_id={self.user_id}, title='{self.title}')>"


class Message(Base):
    """
    Represents a single message in a conversation.
    
    Messages are always tied to a conversation and include the sender's role (user/assistant/system)
    and the message content. They are timestamped and indexed for efficient history retrieval.
    """
    __tablename__ = "messages"

    id = Column(BigInteger, primary_key=True, autoincrement=True, doc="Unique message ID")
    conversation_id = Column(
        BigInteger,
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Foreign key reference to the parent conversation (cascade delete enabled)"
    )
    role = Column(
        String(16),
        nullable=False,
        doc="Role of the message sender: 'user', 'assistant', or 'system'"
    )
    content = Column(
        Text,
        nullable=False,
        doc="The text content of the message"
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        doc="Timestamp when the message was created (UTC)"
    )

    # Many Messages → One Conversation
    conversation = relationship(
        "Conversation",
        back_populates="messages",
        lazy="select",
        doc="Reference to the parent conversation"
    )

    # Composite index on (conversation_id, created_at) for optimized history queries
    __table_args__ = (
        Index("ix_messages_conversation_created", "conversation_id", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<Message(id={self.id}, conversation_id={self.conversation_id}, role='{self.role}')>"
