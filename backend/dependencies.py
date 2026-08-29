"""
dependencies.py
FastAPI dependency functions shared across routers.

  get_db()           — yields a SQLAlchemy session, always closes on exit
  get_current_user() — decodes JWT, returns the authenticated User or 401
"""

from typing import Generator

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from database import SessionLocal
from models.user import User
from services.auth_service import SECRET_KEY, ALGORITHM

# ── OAuth2 scheme — points Swagger UI to the login endpoint ──────────────────
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

# ── Reusable 401 exception ────────────────────────────────────────────────────
_CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials.",
    headers={"WWW-Authenticate": "Bearer"},
)


# ── Database session dependency ───────────────────────────────────────────────

def get_db() -> Generator[Session, None, None]:
    """
    Yield a SQLAlchemy session and guarantee it is closed after the request,
    even if an exception is raised inside the endpoint.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── JWT authentication dependency ────────────────────────────────────────────

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Decode the Bearer JWT from the Authorization header, validate it, and
    return the corresponding User row.

    Raises HTTP 401 if:
      - The token is missing, malformed, or expired.
      - The "sub" claim is absent or not a valid integer.
      - No user with that id exists in the database.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise _CREDENTIALS_EXCEPTION
    except JWTError:
        raise _CREDENTIALS_EXCEPTION

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise _CREDENTIALS_EXCEPTION

    return user
