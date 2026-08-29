'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getToken, clearToken } from '@/lib/api';
import { getTrips } from '@/services/tripService';
import { TripResponse } from '@/services/tripService';
import TripsDashboard from '@/components/TripsDashboard';
import Navbar from '@/components/Navbar';

// ── Auth-guarded client component ─────────────────────────────────────────────
// Server Components cannot read localStorage, so this page is a client
// component that checks for a token before fetching trip data.

export default function TripsPage() {
  const router = useRouter();

  const [trips, setTrips]           = useState<TripResponse[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    // ── Auth guard — redirect immediately if no token ─────────────────────────
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    // ── Fetch trips for the authenticated user ────────────────────────────────
    getTrips()
      .then(data => setTrips(data))
      .catch(err => {
        // 401 is handled inside fetchWithAuth (clears token + redirects)
        // Catch any other error and display it
        setFetchError(err instanceof Error ? err.message : 'Could not load trips.');
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = () => {
    clearToken();
    router.push('/login');
  };

  // Show nothing while checking token / fetching (avoids flash)
  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#f4f4f0' }}
      >
        <div className="border-4 border-black bg-[#f9e07a] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] px-8 py-6 flex items-center gap-4">
          <svg className="animate-spin h-6 w-6 text-black" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm font-black uppercase tracking-widest text-black">Loading your trips…</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: '#f4f4f0', fontFamily: "'Space Grotesk','Inter',system-ui,sans-serif" }}
    >
      {/* ── Top nav ── */}
      <Navbar
        backHref="/"
        backLabel="← Back"
        actionHref="/"
        actionLabel="+ New Trip"
      />

      {/* ── Main content ── */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-10">

        {/* Page heading */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-block bg-black text-[#f9e07a] text-[10px] font-black uppercase tracking-widest px-3 py-1 mb-2 border-2 border-black">
              ✈ Trip Archive
            </div>
            <h1 className="text-4xl sm:text-5xl font-black uppercase leading-none tracking-tight text-black">
              Your Trip<br />
              <span
                className="text-[#f9e07a]"
                style={{ WebkitTextStroke: '2px black', textShadow: '4px 4px 0 #000' }}
              >
                History.
              </span>
            </h1>
          </div>

          {/* Trip count badge */}
          {!fetchError && (
            <div className="border-4 border-black bg-[#f9e07a] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] px-6 py-4 text-center">
              <p className="text-4xl font-black text-black leading-none">{trips.length}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-black/60 mt-1">
                {trips.length === 1 ? 'Trip saved' : 'Trips saved'}
              </p>
            </div>
          )}
        </div>

        {/* Error state */}
        {fetchError && (
          <div className="border-4 border-black bg-[#ff6b6b] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] px-6 py-5 flex items-start gap-3 mb-8">
            <span className="text-2xl shrink-0">⚠️</span>
            <div>
              <p className="font-black text-black uppercase tracking-wide text-sm">Failed to load trips</p>
              <p className="text-sm font-bold text-black/70 mt-1">{fetchError}</p>
              <p className="text-xs font-bold text-black/50 mt-1 uppercase tracking-widest">
                Make sure the FastAPI server is running on port 8000.
              </p>
            </div>
          </div>
        )}

        {/* Dashboard */}
        {!fetchError && <TripsDashboard trips={trips} />}

      </main>

      {/* ── Footer ── */}
      <footer className="border-t-4 border-black bg-black text-white mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="bg-[#f9e07a] border-2 border-black px-2.5 py-1 text-black text-xs font-black uppercase tracking-widest">
              ✦ KelanaAI
            </span>
            <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">
              © 2026 All rights reserved.
            </span>
          </div>
          <p className="text-gray-600 text-xs font-bold uppercase tracking-widest">
            Powered by AWS Bedrock · Next.js App Router
          </p>
        </div>
      </footer>
    </div>
  );
}
