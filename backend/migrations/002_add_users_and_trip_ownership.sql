-- ============================================================
-- Migration 002 — Add users table + trip ownership
-- Applied: manually via psql / pgAdmin / DBeaver
-- Description:
--   STEP 1 — Create the users table
--   STEP 2 — Insert a default fallback user so existing trips
--             can be safely backfilled without FK violations
--   STEP 3 — Add user_id column to trips (nullable first)
--   STEP 4 — Backfill: assign all existing trips to user id=1
--   STEP 5 — Enforce NOT NULL on user_id
--   STEP 6 — Add FK constraint trips.user_id → users.id
-- ============================================================


-- ── STEP 1: Create users table ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
    id            BIGSERIAL       PRIMARY KEY,
    name          VARCHAR(100)    NOT NULL,
    email         VARCHAR(255)    NOT NULL,
    password_hash VARCHAR(255)    NOT NULL,
    created_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS ix_users_email ON users (email);


-- ── STEP 2: Insert default fallback user (id = 1) ────────────────────────────
-- Used to backfill existing trips that have no owner.
-- ON CONFLICT ensures this is safe to re-run.

INSERT INTO users (id, name, email, password_hash)
VALUES (1, 'Default User', 'default@kelana.ai', 'no-auth-placeholder')
ON CONFLICT (id) DO NOTHING;

-- Keep the BIGSERIAL sequence ahead of the manually inserted id=1
SELECT setval('users_id_seq', GREATEST(nextval('users_id_seq'), 2));


-- ── STEP 3: Add user_id column to trips (nullable first) ─────────────────────
-- Adding as nullable so the ALTER does not immediately reject existing rows.

ALTER TABLE trips
ADD COLUMN IF NOT EXISTS user_id BIGINT;


-- ── STEP 4: Backfill existing trips → user_id = 1 ────────────────────────────

UPDATE trips
SET user_id = 1
WHERE user_id IS NULL;


-- ── STEP 5: Enforce NOT NULL on user_id ──────────────────────────────────────

ALTER TABLE trips
ALTER COLUMN user_id SET NOT NULL;


-- ── STEP 6: Add Foreign Key constraint ───────────────────────────────────────
-- DO $$ block guards against re-running on a DB that already has the constraint.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM   information_schema.table_constraints
        WHERE  constraint_name = 'fk_trips_users'
          AND  table_name      = 'trips'
    ) THEN
        ALTER TABLE trips
        ADD CONSTRAINT fk_trips_users
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE;
    END IF;
END;
$$;


-- ── Verification queries (run manually to confirm) ───────────────────────────
-- SELECT column_name, data_type, is_nullable
-- FROM   information_schema.columns
-- WHERE  table_name IN ('users', 'trips')
-- ORDER  BY table_name, ordinal_position;
--
-- SELECT tc.constraint_name, kcu.column_name, ccu.table_name, ccu.column_name
-- FROM   information_schema.table_constraints        tc
-- JOIN   information_schema.key_column_usage         kcu ON kcu.constraint_name = tc.constraint_name
-- JOIN   information_schema.constraint_column_usage  ccu ON ccu.constraint_name = tc.constraint_name
-- WHERE  tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'trips';
