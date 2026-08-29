"""
migrate.py — safe, idempotent database migration for KelanaAI.

Steps performed:
  1. Create the `users` table (IF NOT EXISTS).
  2. Insert a default fallback user (id=1) for existing trips.
  3. Add `user_id` column to `trips` as NULLABLE (IF NOT EXISTS).
  4. Backfill existing rows → user_id = 1.
  5. Enforce NOT NULL on user_id.
  6. Add FK constraint (IF NOT EXISTS).

Safe to run multiple times — every step is guarded.
"""

import os, sys
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from database import engine
from sqlalchemy import text

STEPS = [

    # ── 1. users table ───────────────────────────────────────────────────────
    (
        "Create users table",
        """
        CREATE TABLE IF NOT EXISTS users (
            id            BIGSERIAL PRIMARY KEY,
            name          VARCHAR(100)  NOT NULL,
            email         VARCHAR(255)  NOT NULL UNIQUE,
            password_hash VARCHAR(255)  NOT NULL,
            created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ix_users_email ON users (email);
        """,
    ),

    # ── 2. default fallback user ─────────────────────────────────────────────
    (
        "Insert default fallback user (id=1)",
        """
        INSERT INTO users (id, name, email, password_hash)
        VALUES (1, 'Default User', 'default@kelana.ai', 'no-auth')
        ON CONFLICT (id) DO NOTHING;
        """,
    ),

    # ── 3. add user_id column (nullable first) ───────────────────────────────
    (
        "Add user_id column to trips (nullable)",
        """
        ALTER TABLE trips
        ADD COLUMN IF NOT EXISTS user_id BIGINT;
        """,
    ),

    # ── 4. backfill ──────────────────────────────────────────────────────────
    (
        "Backfill existing trips → user_id = 1",
        """
        UPDATE trips SET user_id = 1 WHERE user_id IS NULL;
        """,
    ),

    # ── 5. enforce NOT NULL ──────────────────────────────────────────────────
    (
        "Set user_id NOT NULL",
        """
        ALTER TABLE trips ALTER COLUMN user_id SET NOT NULL;
        """,
    ),

    # ── 6. foreign key constraint ────────────────────────────────────────────
    (
        "Add FK constraint fk_trips_users (IF NOT EXISTS)",
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints
                WHERE constraint_name = 'fk_trips_users'
                  AND table_name      = 'trips'
            ) THEN
                ALTER TABLE trips
                ADD CONSTRAINT fk_trips_users
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
            END IF;
        END;
        $$;
        """,
    ),
]


def run():
    with engine.connect() as conn:
        for label, sql in STEPS:
            print(f"  → {label} ...", end=" ", flush=True)
            conn.execute(text(sql))
            conn.commit()
            print("done")

    # ── Verification ─────────────────────────────────────────────────────────
    print("\n── trips table columns ──────────────────────────────────────────")
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM   information_schema.columns
            WHERE  table_name = 'trips'
            ORDER  BY ordinal_position;
        """))
        print(f"{'Column':<22} {'Type':<28} {'Nullable':<10} Default")
        print("─" * 78)
        for r in rows:
            print(f"{r[0]:<22} {r[1]:<28} {r[2]:<10} {r[3] or ''}")

    print("\n── users table columns ──────────────────────────────────────────")
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT column_name, data_type, is_nullable
            FROM   information_schema.columns
            WHERE  table_name = 'users'
            ORDER  BY ordinal_position;
        """))
        print(f"{'Column':<22} {'Type':<28} Nullable")
        print("─" * 60)
        for r in rows:
            print(f"{r[0]:<22} {r[1]:<28} {r[2]}")

    print("\n── FK constraints on trips ──────────────────────────────────────")
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT tc.constraint_name, kcu.column_name,
                   ccu.table_name AS ref_table, ccu.column_name AS ref_col
            FROM   information_schema.table_constraints        tc
            JOIN   information_schema.key_column_usage         kcu
                   ON  kcu.constraint_name = tc.constraint_name
            JOIN   information_schema.constraint_column_usage  ccu
                   ON  ccu.constraint_name = tc.constraint_name
            WHERE  tc.constraint_type = 'FOREIGN KEY'
              AND  tc.table_name      = 'trips';
        """))
        for r in rows:
            print(f"  {r[0]}: trips.{r[1]} → {r[2]}.{r[3]}")


if __name__ == "__main__":
    print("KelanaAI — database migration\n")
    run()
    print("\nMigration complete ✓")
