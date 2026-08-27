import Link from 'next/link';
import { getTrips } from '@/services/tripService';
import TripsDashboard from '@/components/TripsDashboard';

// ── Server Component — data fetched at request time ───────────────────────────

export const dynamic = 'force-dynamic'; // always fresh, never cached

export default async function TripsPage() {
  let trips: Awaited<ReturnType<typeof getTrips>> = [];
  let fetchError: string | null = null;

  try {
    trips = await getTrips();
  } catch (err) {
    fetchError = err instanceof Error ? err.message : 'Could not load trips.';
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: '#f4f4f0', fontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif" }}
    >
      {/* ── Top nav bar ── */}
      <header className="border-b-4 border-black bg-[#f9e07a]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 border-2 border-black bg-black text-[#f9e07a] text-xs font-black uppercase tracking-widest px-3 py-1.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] hover:bg-[#111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100"
          >
            ← Back
          </Link>
          <span className="text-sm font-black uppercase tracking-widest text-black">✦ KelanaAI</span>
          <Link
            href="/"
            className="inline-flex items-center gap-2 border-2 border-black bg-white text-black text-xs font-black uppercase tracking-widest px-3 py-1.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-[#b8f0a0] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100"
          >
            + New Trip
          </Link>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-10">

        {/* ── Page heading ── */}
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

        {/* ── Error state ── */}
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

        {/* ── Empty state + search/sort dashboard ── */}
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
