from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from models.trip import Trip
from database import SessionLocal, init_db

from services.trip_service import (
    calculate_daily_budget,
    get_trip_category
)
from services.bedrock_service import (
    get_ai_recommendation
)


app = FastAPI()

# Allow the Next.js dev server (and any local origin) to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()


class TripRequest(BaseModel):
    destination: str
    days: int
    budget: float
    travel_style: str = "Standard"


class TripUpdate(BaseModel):
    destination: str
    days: int
    budget: float
    travel_style: str = "Standard"


@app.get("/")
def home():
    return {
        "message": "Welcome to KelanaAI"
    }


@app.get("/health")
def health():
    return {
        "status": "OK"
    }


# CREATE
@app.post("/api/v1/trips")
def create_trip(request: TripRequest):
    daily_budget = calculate_daily_budget(
        request.budget,
        request.days
    )

    category = get_trip_category(
        request.budget
    )
    
    ai_recommendation = get_ai_recommendation(
        destination = request.destination,
        days = request.days,
        budget = request.budget,
        travel_style = request.travel_style,
    )

    trip = Trip(
        destination=request.destination,
        days=request.days,
        budget=request.budget,
        category=category,
        daily_budget=daily_budget,
        travel_style=request.travel_style,
        ai_recommendation=ai_recommendation
    )

    db = SessionLocal()

    db.add(trip)
    db.commit()
    db.refresh(trip)

    db.close()

    return trip


# READ ALL
@app.get("/api/v1/trips")
def get_trips():
    db = SessionLocal()

    trips = db.query(Trip).all()

    db.close()

    return trips


# READ BY ID
@app.get("/api/v1/trips/{trip_id}")
def get_trip(trip_id: int):
    db = SessionLocal()

    trip = db.query(Trip).filter(
        Trip.id == trip_id
    ).first()

    db.close()

    if trip is None:
        raise HTTPException(
            status_code=404,
            detail="Trip not found"
        )

    return trip


# UPDATE
@app.put("/api/v1/trips/{trip_id}")
def update_trip(trip_id: int, request: TripUpdate):
    db = SessionLocal()

    trip = db.query(Trip).filter(
        Trip.id == trip_id
    ).first()

    if trip is None:
        db.close()

        raise HTTPException(
            status_code=404,
            detail="Trip not found"
        )

    daily_budget = calculate_daily_budget(
        request.budget,
        request.days
    )

    category = get_trip_category(
        request.budget
    )

    trip.destination = request.destination
    trip.days = request.days
    trip.budget = request.budget
    trip.category = category
    trip.daily_budget = daily_budget
    trip.travel_style = request.travel_style
    trip.ai_recommendation = get_ai_recommendation(
        destination=request.destination,
        days=request.days,
        budget=request.budget,
        travel_style=request.travel_style,
    )

    db.commit()
    db.refresh(trip)

    db.close()

    return trip


# DELETE
@app.delete("/api/v1/trips/{trip_id}")
def delete_trip(trip_id: int):
    db = SessionLocal()

    trip = db.query(Trip).filter(
        Trip.id == trip_id
    ).first()

    if trip is None:
        db.close()

        raise HTTPException(
            status_code=404,
            detail="Trip not found"
        )

    db.delete(trip)
    db.commit()

    db.close()

    return {
        "message": "Trip deleted successfully"
    }


@app.get("/api/v1/recommendations")
def get_recommendations():
    return [
        "Tokyo Tower",
        "Mount Fuji",
        "Shibuya"
    ]


@app.get("/api/v1/transportations")
def get_transportations():
    return [
        "Bus",
        "Train",
        "Flight"
    ]