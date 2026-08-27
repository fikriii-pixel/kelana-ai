'use client';

import { useState, useMemo } from 'react';
import { TripResponse } from '@/services/tripService';
import TripCard from '@/components/TripCard';
import EmptyState from '@/components/EmptyState';

// ── Types ─────────────────────────────────────────────────────────────────────

type SortMode = 'latest' | 'oldest' | 'budget_high' | 'budget_low';

interface TripsDashboardProps {
  trips: TripResponse[];
}

// ── Sort options config ───────────────────────────────────────────────────────

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'latest',      label: '🕐 Latest First'      },
  { value: 'oldest',      label: '📅 Oldest First'      },
  { value: 'budget_high', label: '💰 Highest Budget'    },
  { value: 'budget_low',  label: '💸 Lowest Budget'     },
];

// ── Sort comparator ───────────────────────────────────────────────────────────

function sortTrips(trips: TripResponse[], mode: SortMode): TripResponse[] {
  const copy = [...trips];
  switch (mode) {
    case 'latest':      return copy.sort((a, b) => b.id - a.id);
    case 'oldest':      return copy.sort((a, b) => a.id - b.id);
    case 'budget_high': return copy.sort((a, b) => b.budget - a.budget);
    case 'budget_low':  return copy.sort((a, b) => a.budget - b.budget);
    default:            return copy;
  }
}

// ── No-results card ───────────────────────────────────────────────────────────

function NoSearchResults({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-[#f9e07a] border-b-4 border-black px-6 py-4 flex items-center gap-3">
          <span className="text-xl">🔍</span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-black/50">Search Results</p>
            <p className="text-sm font-black uppercase tracking-wide text-black">No Matches Found</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-8 flex flex-col items-center text-center gap-5">
          <div className="text-5xl">🗺️</div>

          <div className="space-y-2">
            <h2 className="text-lg font-black uppercase tracking-tight text-black">
              No trips matching
            </h2>
            {/* Query chip */}
            <div className="inline-flex items-center gap-1.5 border-2 border-black bg-[#f4f4f0] px-3 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-xs font-black uppercase tracking-widest text-black">
                &ldquo;{query}&rdquo;
              </span>
            </div>
            <p className="text-sm font-bold text-gray-500 max-w-xs mx-auto">
              Try a different destination or travel style.
            </p>
          </div>

          <button
            onClick={onClear}
            className="
              inline-flex items-center justify-center gap-2
              w-full py-3
              border-4 border-black
              bg-black text-[#f9e07a]
              text-sm font-black uppercase tracking-widest
              shadow-[4px_4px_0px_0px_rgba(249,224,122,1)]
              hover:bg-[#111]
              active:translate-x-[4px] active:translate-y-[4px] active:shadow-none
              transition-all duration-100
            "
          >
            ✕ Clear Search
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main client component ─────────────────────────────────────────────────────

export default function TripsDashboard({ trips }: TripsDashboardProps) {
  const [query, setQuery]       = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('latest');

  // 1. Filter → 2. Sort — both derived from props + state, never mutate the original array
  const filteredTrips = useMemo(() => {
    const q = query.trim().toLowerCase();

    const filtered = q
      ? trips.filter(
          (t) =>
            t.destination.toLowerCase().includes(q) ||
            t.category.toLowerCase().includes(q),
        )
      : trips;

    return sortTrips(filtered, sortMode);
  }, [trips, query, sortMode]);

  // Empty initial data — hand off to the full EmptyState component
  if (trips.length === 0) return <EmptyState />;

  return (
    <div>
      {/* ── Toolbar ── */}
      <div className="flex flex-col md:flex-row gap-3 mb-8">

        {/* Search input */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-4 flex items-center text-black/40 font-black pointer-events-none text-sm">
            🔍
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search destination or travel style…"
            className="
              w-full pl-10 pr-10 py-3
              border-4 border-black
              bg-white
              shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
              text-sm font-bold text-black
              placeholder:text-black/30 placeholder:font-bold
              focus:outline-none focus:bg-[#f9e07a]
              focus:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]
              transition-all duration-100
            "
            aria-label="Search trips"
          />
          {/* Clear ✕ button */}
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute inset-y-0 right-3 flex items-center px-1 text-black/40 hover:text-black font-black text-lg transition-colors"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Sort dropdown */}
        <div className="relative md:w-56">
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="
              w-full px-4 py-3
              border-4 border-black
              bg-white
              shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
              text-sm font-black text-black uppercase tracking-wide
              focus:outline-none focus:bg-[#a0d4f0]
              focus:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]
              cursor-pointer appearance-none
              transition-all duration-100
            "
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='black' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")",
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 14px center',
            }}
            aria-label="Sort trips"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Results count tag ── */}
      <div className="flex items-center gap-3 mb-5">
        <span className="border-2 border-black bg-black text-[#f9e07a] text-[10px] font-black uppercase tracking-widest px-2.5 py-1 shadow-[2px_2px_0px_0px_rgba(249,224,122,0.4)]">
          {filteredTrips.length} {filteredTrips.length === 1 ? 'result' : 'results'}
        </span>
        {query && (
          <span className="text-xs font-bold text-black/40 uppercase tracking-widest">
            for &ldquo;{query}&rdquo;
          </span>
        )}
      </div>

      {/* ── No search results ── */}
      {filteredTrips.length === 0 && (
        <NoSearchResults query={query} onClear={() => setQuery('')} />
      )}

      {/* ── Trip grid ── */}
      {filteredTrips.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTrips.map((trip, index) => (
            <TripCard key={trip.id} trip={trip} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}
