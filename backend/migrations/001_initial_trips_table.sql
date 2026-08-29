-- ============================================================
-- Migration 001 — Initial trips table
-- Applied: manually via psql / pgAdmin / DBeaver
-- Description: Creates the baseline trips table with all
--              original columns (no user ownership yet).
-- ============================================================

CREATE TABLE IF NOT EXISTS trips (
    id                SERIAL          PRIMARY KEY,
    destination       VARCHAR         NOT NULL,
    days              INTEGER         NOT NULL,
    budget            DOUBLE PRECISION NOT NULL,
    category          VARCHAR         NOT NULL,
    daily_budget      DOUBLE PRECISION NOT NULL,
    travel_style      VARCHAR(50)     DEFAULT 'Solo',
    ai_recommendation TEXT,
    created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
