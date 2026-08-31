from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from models.user import User
from models.trip import Trip
from database import init_db

from services.trip_service import calculate_daily_budget, get_trip_category
from services.bedrock_service import get_ai_recommendation
from services.auth_service import hash_password

from dependencies import get_db, get_current_user
from routers import auth, kb


app = FastAPI(title="KelanaAI API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

app.include_router(auth.router)
app.include_router(kb.router)


# ── Pydantic Schemas ──────────────────────────────────────────────────────────

class UserBase(BaseModel):
    name: str
    email: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    created_at: str
    class Config:
        from_attributes = True


class TripRequest(BaseModel):
    destination: str
    days: int
    budget: float
    travel_style: str = "Solo"
    # user_id is no longer accepted from the client —
    # it is injected from the verified JWT token.


class TripUpdate(BaseModel):
    destination: str
    days: int
    budget: float
    travel_style: str = "Solo"


class TripResponse(BaseModel):
    id: int
    destination: str
    days: int
    budget: float
    category: str
    daily_budget: float
    travel_style: Optional[str]
    ai_recommendation: Optional[str]
    user_id: int
    created_at: str
    class Config:
        from_attributes = True


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/")
def home():
    return {"message": "Welcome to KelanaAI"}

@app.get("/health")
def health():
    return {"status": "OK"}


# ── Users (admin / internal) ──────────────────────────────────────────────────

@app.post("/api/v1/users", response_model=UserResponse, status_code=201)
def create_user(request: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(
        name=request.name,
        email=request.email,
        password_hash=hash_password(request.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _user_to_dict(user)


@app.get("/api/v1/users", response_model=list[UserResponse])
def get_users(db: Session = Depends(get_db)):
    return [_user_to_dict(u) for u in db.query(User).order_by(User.id).all()]


@app.get("/api/v1/users/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return _user_to_dict(user)


@app.delete("/api/v1/users/{user_id}", status_code=200)
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}


# ── Trips (JWT-protected) ─────────────────────────────────────────────────────

@app.post("/api/v1/trips", response_model=TripResponse, status_code=201)
def create_trip(
    request: TripRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a trip owned by the authenticated user."""
    daily_budget = calculate_daily_budget(request.budget, request.days)
    category     = get_trip_category(request.budget)
    ai_rec       = get_ai_recommendation(
        destination=request.destination,
        days=request.days,
        budget=request.budget,
        travel_style=request.travel_style,
    )
    trip = Trip(
        destination=request.destination,
        days=request.days,
        budget=request.budget,
        category=category,
        daily_budget=daily_budget,
        travel_style=request.travel_style,
        ai_recommendation=ai_rec,
        user_id=current_user.id,   # always from token — never from request body
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return _trip_to_dict(trip)


@app.get("/api/v1/trips", response_model=list[TripResponse])
def get_trips(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Fetch all trips belonging to the authenticated user.
    Automatically filters by Trip.user_id == current_user.id.
    Only returns trips owned by the authenticated user.
    """
    trips = (
        db.query(Trip)
        .filter(Trip.user_id == current_user.id)
        .order_by(Trip.id.desc())
        .all()
    )
    return [_trip_to_dict(t) for t in trips]


@app.get("/api/v1/trips/{trip_id}", response_model=TripResponse)
def get_trip(
    trip_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Fetch a single trip — check existence first (404), then ownership (403).
    Only the trip owner can view their trip.
    """
    # ── 1. Retrieve trip by ID ────────────────────────────────────────────────
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if trip is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found"
        )

    # ── 2. Check ownership ────────────────────────────────────────────────────
    if trip.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this trip"
        )

    return _trip_to_dict(trip)


@app.put("/api/v1/trips/{trip_id}", response_model=TripResponse)
def update_trip(
    trip_id: int,
    request: TripUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update a trip — check existence first (404), then ownership (403).
    Only the trip owner can update their trip.
    """
    # ── 1. Retrieve trip by ID ────────────────────────────────────────────────
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if trip is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found"
        )

    # ── 2. Check ownership ────────────────────────────────────────────────────
    if trip.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to update this trip"
        )

    # ── 3. Update trip ────────────────────────────────────────────────────────
    daily_budget = calculate_daily_budget(request.budget, request.days)
    category     = get_trip_category(request.budget)

    trip.destination       = request.destination
    trip.days              = request.days
    trip.budget            = request.budget
    trip.category          = category
    trip.daily_budget      = daily_budget
    trip.travel_style      = request.travel_style
    trip.ai_recommendation = get_ai_recommendation(
        destination=request.destination,
        days=request.days,
        budget=request.budget,
        travel_style=request.travel_style,
    )
    db.commit()
    db.refresh(trip)
    return _trip_to_dict(trip)


@app.delete("/api/v1/trips/{trip_id}", status_code=200)
def delete_trip(
    trip_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Delete a trip — check existence first (404), then ownership (403).
    Only the trip owner can delete their trip.
    """
    # ── 1. Retrieve trip by ID ────────────────────────────────────────────────
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if trip is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found"
        )

    # ── 2. Check ownership ────────────────────────────────────────────────────
    if trip.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this trip"
        )

    # ── 3. Delete trip ───────────────────────────────────────────────────────
    db.delete(trip)
    db.commit()
    return {"message": "Trip deleted successfully"}


# ── Misc ──────────────────────────────────────────────────────────────────────

@app.get("/api/v1/recommendations")
def get_recommendations():
    return ["Tokyo Tower", "Mount Fuji", "Shibuya"]

@app.get("/api/v1/transportations")
def get_transportations():
    return ["Bus", "Train", "Flight"]


# ── Serialisation helpers ─────────────────────────────────────────────────────

def _trip_to_dict(trip: Trip) -> dict:
    return {
        "id":                trip.id,
        "destination":       trip.destination,
        "days":              trip.days,
        "budget":            trip.budget,
        "category":          trip.category,
        "daily_budget":      trip.daily_budget,
        "travel_style":      trip.travel_style,
        "ai_recommendation": trip.ai_recommendation,
        "user_id":           trip.user_id,
        "created_at":        trip.created_at.isoformat(),
    }

def _user_to_dict(user: User) -> dict:
    return {
        "id":         user.id,
        "name":       user.name,
        "email":      user.email,
        "created_at": user.created_at.isoformat(),
    }
