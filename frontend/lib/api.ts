/**
 * lib/api.ts
 * Authenticated fetch wrapper for KelanaAI.
 *
 * - Automatically reads the JWT from localStorage and injects
 *   `Authorization: Bearer <token>` into every request.
 * - On 401 Unauthorized: clears the token and redirects to /login.
 * - Safe to call from any client-side context (browser only).
 */

const API_BASE = "http://localhost:8000/api/v1";

// ── Token helpers ─────────────────────────────────────────────────────────────

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function setToken(token: string): void {
  localStorage.setItem("token", token);
}

export function clearToken(): void {
  localStorage.removeItem("token");
}

// ── Core authenticated fetch ──────────────────────────────────────────────────

export async function fetchWithAuth(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  // Token expired or invalid — clear it and force re-login
  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }

  return res;
}
