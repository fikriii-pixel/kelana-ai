/**
 * services/tripService.ts
 * All trip-related API calls — authenticated via fetchWithAuth.
 * If the API URL changes, update API_URL once here.
 */

import { fetchWithAuth } from '@/lib/api';

// ── Shared types ──────────────────────────────────────────────────────────────

export interface TripRequestPayload {
  destination: string;
  budget: number;
  days: number;
  travel_style: string;
  // NOTE: user_id is intentionally absent — the backend injects it from the JWT.
}

export interface TripResponse {
  id: number;
  destination: string;
  days: number;
  budget: number;
  category: string;
  daily_budget: number;
  travel_style: string;
  ai_recommendation: string;
  user_id: number;
  created_at: string;
}

// ── API helpers ───────────────────────────────────────────────────────────────

/** Fetch all trips belonging to the authenticated user */
export async function getTrips(): Promise<TripResponse[]> {
  const res = await fetchWithAuth('/trips');
  if (!res.ok) throw new Error(`Failed to fetch trips: ${res.status}`);
  return res.json();
}

/** Fetch a single trip by ID */
export async function getTrip(id: number): Promise<TripResponse> {
  const res = await fetchWithAuth(`/trips/${id}`);
  if (!res.ok) throw new Error(`Trip #${id} not found: ${res.status}`);
  return res.json();
}

/** Create a new trip — user_id is assigned server-side from JWT */
export async function generateTrip(
  data: TripRequestPayload
): Promise<TripResponse> {
  const res = await fetchWithAuth('/trips', {
    method: 'POST',
    body:   JSON.stringify(data),
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
  const res = await fetchWithAuth(`/trips/${id}`, {
    method: 'PUT',
    body:   JSON.stringify(data),
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
  const res = await fetchWithAuth(`/trips/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to delete trip #${id}: ${res.status}`);
}
