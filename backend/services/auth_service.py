"""
services/auth_service.py

Responsibilities:
  - Password hashing / verification (bcrypt via passlib)
  - JWT creation (python-jose / HS256)

SECURITY NOTES:
  - Plain-text passwords are NEVER stored, logged, or returned.
  - bcrypt salts every hash automatically.
  - JWTs are stateless — no server-side session is stored.
  - SECRET_KEY is loaded exclusively from .env — never hardcoded.
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from dotenv import load_dotenv
from jose import jwt
from passlib.context import CryptContext

load_dotenv()

# ── Password hashing ──────────────────────────────────────────────────────────

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Return a bcrypt hash of *password*. Never call with logged input."""
    return _pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Return True if *plain_password* matches *hashed_password*."""
    return _pwd_context.verify(plain_password, hashed_password)


# ── JWT configuration (read once at import time) ──────────────────────────────

SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "")
ALGORITHM:  str = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
    os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "60")
)

if not SECRET_KEY:
    raise RuntimeError(
        "JWT_SECRET_KEY is not set. Add it to your .env file before starting."
    )


# ── JWT creation ──────────────────────────────────────────────────────────────

def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Sign and return a JWT access token.

    Args:
        data:          Payload dict. Must include "sub" (subject = user id as str).
        expires_delta: Custom TTL. Defaults to ACCESS_TOKEN_EXPIRE_MINUTES.

    Returns:
        Signed JWT string.
    """
    ttl = expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    payload = data.copy()
    payload["exp"] = datetime.now(tz=timezone.utc) + ttl

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
