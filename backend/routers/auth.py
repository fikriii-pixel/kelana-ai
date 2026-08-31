from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy.orm import Session

from database import SessionLocal
from models.user import User
from services.auth_service import (
    hash_password,
    verify_password,
    create_access_token,
)
from dependencies import get_current_user

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class UserRegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        return v

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name must not be blank.")
        return v.strip()


class UserRegisterResponse(BaseModel):
    id: int
    name: str
    email: str
    created_at: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserProfileResponse(BaseModel):
    id: int
    name: str
    email: str
    total_trips: int


# ── POST /api/v1/auth/register ────────────────────────────────────────────────

@router.post(
    "/register",
    response_model=UserRegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
def register(request: UserRegisterRequest):
    db = SessionLocal()
    try:
        existing = db.query(User).filter(
            User.email == request.email.lower()
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered.",
            )

        user = User(
            name=request.name,
            email=request.email.lower(),
            password_hash=hash_password(request.password),  # plain text never stored
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        return UserRegisterResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            created_at=user.created_at.isoformat(),
        )
    finally:
        db.close()


# ── POST /api/v1/auth/login ───────────────────────────────────────────────────

@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Login and obtain a JWT access token",
    description=(
        "Validates email + password credentials. "
        "On success returns a signed JWT bearer token. "
        "The token is stateless — no session is stored server-side. "
        "password_hash is NEVER included in the response."
    ),
)
def login(request: LoginRequest):
    db = SessionLocal()
    try:
        # ── 1. Look up user by email ──────────────────────────────────────────
        user = db.query(User).filter(
            User.email == request.email.lower()
        ).first()

        # ── 2. Validate credentials ───────────────────────────────────────────
        # Deliberately use a single generic error for both "user not found" and
        # "wrong password" to prevent user enumeration attacks.
        if not user or not verify_password(request.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # ── 3. Issue JWT — payload contains only non-sensitive claims ─────────
        token = create_access_token(data={"sub": str(user.id)})

        # ── 4. Return token — password_hash never leaves this function ────────
        return TokenResponse(access_token=token, token_type="bearer")

    finally:
        db.close()


# ── GET /api/v1/auth/me ───────────────────────────────────────────────────────

@router.get(
    "/me",
    response_model=UserProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current authenticated user profile",
    description=(
        "Returns the authenticated user's profile information including "
        "name, email, and total number of trips created. "
        "Requires a valid JWT Bearer token in the Authorization header."
    ),
)
def get_me(
    current_user: User = Depends(get_current_user),
) -> UserProfileResponse:
    """
    Return the authenticated user's profile with trip count.

    The current_user is injected via JWT validation in get_current_user().
    total_trips is calculated from the user's trips relationship.
    """
    total_trips = len(current_user.trips)

    return UserProfileResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        total_trips=total_trips,
    )
