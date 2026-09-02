-- ============================================================
-- Migration 003 — Chat history tables
-- Applied: manually via psql / pgAdmin / DBeaver
-- Description: Creates conversations and messages tables
--              for storing chat history between users and
--              the assistant. Includes cascade delete and
--              optimized indexes for efficient queries.
-- ============================================================

-- Conversations table: stores individual chat sessions
CREATE TABLE IF NOT EXISTS conversations (
    id                BIGSERIAL       PRIMARY KEY,
    user_id           BIGINT          NOT NULL,
    title             VARCHAR(256)    NOT NULL DEFAULT 'New Conversation',
    created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Index on user_id for fast lookups of user's conversations
CREATE INDEX IF NOT EXISTS ix_conversations_user_id ON conversations(user_id);

-- Messages table: stores individual messages within conversations
CREATE TABLE IF NOT EXISTS messages (
    id                BIGSERIAL       PRIMARY KEY,
    conversation_id   BIGINT          NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role              VARCHAR(16)     NOT NULL,
    content           TEXT            NOT NULL,
    created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Index on conversation_id for fast lookups of messages in a conversation
CREATE INDEX IF NOT EXISTS ix_messages_conversation_id ON messages(conversation_id);

-- Composite index on (conversation_id, created_at) for optimized history queries
CREATE INDEX IF NOT EXISTS ix_messages_conversation_created ON messages(conversation_id, created_at);
