/**
 * lib/server-auth.ts
 * 
 * Server-side authentication helpers for Next.js server components.
 * 
 * Since server components don't have access to localStorage, we read the token
 * from request headers that middleware adds (x-auth-token).
 */

import { headers } from 'next/headers';

/**
 * Get the JWT token in a server component context.
 * 
 * The middleware adds the token to x-auth-token header from cookies.
 * Returns null if no token is present (user not authenticated).
 */
export async function getServerToken(): Promise<string | null> {
  try {
    const headersList = await headers();
    return headersList.get('x-auth-token');
  } catch {
    return null;
  }
}

/**
 * Authenticated fetch for server components.
 * 
 * Similar to fetchWithAuth, but reads token from headers instead of localStorage.
 * 
 * @param path - API endpoint path (e.g., '/trips/1')
 * @param options - Fetch options
 * @returns Response from the API
 */
export async function fetchWithServerAuth(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getServerToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const API_BASE = 'http://localhost:8000/api/v1';
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  return res;
}
