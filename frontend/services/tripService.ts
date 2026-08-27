// All trip-related API calls live here.
// If the API URL changes, update API_URL once — not every page.

const API_URL = "http://localhost:8000/api/v1";

// ── Shared types ──────────────────────────────────────────────────────────────

export interface TripRequestPayload {
  destination: string;
  budget: number;
  days: number;
  travel_style: string;
}

export interface TripResponse {
  id: number;
  destination: string;
  days: number;
  budget: number;
  category: string;
  daily_budget: number;
  ai_recommendation: string;
  created_at: string;
}

// ── API helpers ───────────────────────────────────────────────────────────────

/** Fetch all saved trips */
export async function getTrips(): Promise<TripResponse[]> {
  const res = await fetch(`${API_URL}/trips`, {
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Failed to fetch trips: ${res.status}`);
  return res.json();
}

/** Fetch a single trip by ID */
export async function getTrip(id: number): Promise<TripResponse> {
  const res = await fetch(`${API_URL}/trips/${id}`, {
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Trip #${id} not found: ${res.status}`);
  return res.json();
}

/** Create a new trip and get an AI itinerary */
export async function generateTrip(
  data: TripRequestPayload
): Promise<TripResponse> {
  const res = await fetch(`${API_URL}/trips`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(
      errData?.detail ?? `Server error: ${res.status} ${res.statusText}`
    );
  }
  return res.json();
}

/** Update an existing trip (regenerates AI itinerary) */
export async function updateTrip(
  id: number,
  data: TripRequestPayload
): Promise<TripResponse> {
  const res = await fetch(`${API_URL}/trips/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(
      errData?.detail ?? `Server error: ${res.status} ${res.statusText}`
    );
  }
  return res.json();
}

/** Delete a trip by ID */
export async function deleteTrip(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/trips/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Failed to delete trip #${id}: ${res.status}`);
}
