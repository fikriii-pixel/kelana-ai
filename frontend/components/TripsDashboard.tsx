'use client';

import { useState, useMemo, useEffect } from 'react';
import { TripResponse } from '@/services/tripService';
import TripCard from '@/components/TripCard';
import EmptyState from '@/components/EmptyState';

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 6;

// ── Types ─────────────────────────────────────────────────────────────────────

type SortMode = 'latest' | 'oldest' | 'budget_high' | 'budget_low';

interface TripsDashboardProps {
  trips: TripResponse[];
}

// ── Sort options ──────────────────────────────────────────────────────────────

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'latest',      label: '🕐 Latest First'   },
  { value: 'oldest',      label: '📅 Oldest First'   },
  { value: 'budget_high', label: '💰 Highest Budget' },
  { value: 'budget_low',  label: '💸 Lowest Budget'  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

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
        <div className="bg-[#f9e07a] border-b-4 border-black px-6 py-4 flex items-center gap-3">
          <span className="text-xl">🔍</span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-black/50">Search Results</p>
            <p className="text-sm font-black uppercase tracking-wide text-black">No Matches Found</p>
          </div>
        </div>
        <div className="px-6 py-8 flex flex-col items-center text-center gap-5">
          <div className="text-5xl">🗺️</div>
          <div className="space-y-2">
            <h2 className="text-lg font-black uppercase tracking-tight text-black">
              No trips matching
            </h2>
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
            className="inline-flex items-center justify-center gap-2 w-full py-3 border-4 border-black bg-black text-[#f9e07a] text-sm font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(249,224,122,1)] hover:bg-[#111] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-100"
          >
            ✕ Clear Search
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Pagination controls ───────────────────────────────────────────────────────

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  onPage: (n: number) => void;
}

function Pagination({ currentPage, totalPages, onPrev, onNext, onPage }: PaginationProps) {
  // Build page number array — show at most 5 pages around current
  const pages: (number | '…')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('…');
    const start = Math.max(2, currentPage - 1);
    const end   = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push('…');
    pages.push(totalPages);
  }

  const btnBase    = 'inline-flex items-center justify-center border-2 border-black text-xs font-black uppercase tracking-widest px-3 py-2 min-w-[2.5rem] transition-all duration-100';
  const activeBtn  = `${btnBase} bg-black text-[#f9e07a] shadow-[2px_2px_0px_0px_rgba(249,224,122,0.6)]`;
  const normalBtn  = `${btnBase} bg-white text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-[#f9e07a] hover:shadow-none active:translate-x-[3px] active:translate-y-[3px] active:shadow-none`;
  const disabledBtn = `${btnBase} bg-[#f4f4f0] text-black/30 cursor-not-allowed shadow-none`;

  return (
    <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 border-t-4 border-black pt-6">
      {/* Summary */}
      <span className="text-xs font-black uppercase tracking-widest text-black/50">
        Page {currentPage} of {totalPages}
      </span>

      {/* Controls */}
      <div className="flex items-center gap-1.5">
        {/* Previous */}
        <button
          onClick={onPrev}
          disabled={currentPage === 1}
          className={currentPage === 1 ? disabledBtn : normalBtn}
          aria-label="Previous page"
        >
          ← Prev
        </button>

        {/* Page numbers */}
        {pages.map((p, i) =>
          p === '…' ? (
            <span
              key={`ellipsis-${i}`}
              className="inline-flex items-center justify-center px-2 text-xs font-black text-black/40"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p)}
              className={p === currentPage ? activeBtn : normalBtn}
              aria-label={`Page ${p}`}
              aria-current={p === currentPage ? 'page' : undefined}
            >
              {p}
            </button>
          )
        )}

        {/* Next */}
        <button
          onClick={onNext}
          disabled={currentPage === totalPages}
          className={currentPage === totalPages ? disabledBtn : normalBtn}
          aria-label="Next page"
        >
          Next →
        </button>
      </div>

      {/* Per-page label */}
      <span className="border-2 border-black bg-black text-[#f9e07a] text-[10px] font-black uppercase tracking-widest px-2.5 py-1">
        {PAGE_SIZE} / page
      </span>
    </div>
  );
}

// ── Main client component ─────────────────────────────────────────────────────

export default function TripsDashboard({ trips }: TripsDashboardProps) {
  const [query,    setQuery]    = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('latest');
  const [page,     setPage]     = useState(1);

  // 1. Filter → 2. Sort
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

  // Reset to page 1 whenever filter or sort changes
  useEffect(() => { setPage(1); }, [query, sortMode]);

  // Pagination derived values
  const totalPages  = Math.max(1, Math.ceil(filteredTrips.length / PAGE_SIZE));
  const pageStart   = (page - 1) * PAGE_SIZE;
  const pageTrips   = filteredTrips.slice(pageStart, pageStart + PAGE_SIZE);
  // Global index offset so TripCard accent colours stay consistent across pages
  const indexOffset = pageStart;

  // Empty initial data
  if (trips.length === 0) return <EmptyState />;

  return (
    <div>
      {/* ── Toolbar ── */}
      <div className="flex flex-col md:flex-row gap-3 mb-8">

        {/* Search */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-4 flex items-center text-black/40 pointer-events-none text-sm">
            🔍
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search destination or travel style…"
            className="w-full pl-10 pr-10 py-3 border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-sm font-bold text-black placeholder:text-black/30 focus:outline-none focus:bg-[#f9e07a] focus:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all duration-100"
            aria-label="Search trips"
          />
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

        {/* Sort */}
        <div className="relative md:w-56">
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="w-full px-4 py-3 border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-sm font-black text-black uppercase tracking-wide focus:outline-none focus:bg-[#a0d4f0] focus:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] cursor-pointer appearance-none transition-all duration-100"
            style={{
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='black' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")",
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 14px center',
            }}
            aria-label="Sort trips"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Results meta ── */}
      <div className="flex items-center gap-3 mb-5">
        <span className="border-2 border-black bg-black text-[#f9e07a] text-[10px] font-black uppercase tracking-widest px-2.5 py-1 shadow-[2px_2px_0px_0px_rgba(249,224,122,0.4)]">
          {filteredTrips.length} {filteredTrips.length === 1 ? 'result' : 'results'}
        </span>
        {query && (
          <span className="text-xs font-bold text-black/40 uppercase tracking-widest">
            for &ldquo;{query}&rdquo;
          </span>
        )}
        {filteredTrips.length > PAGE_SIZE && (
          <span className="ml-auto text-[10px] font-bold text-black/40 uppercase tracking-widest">
            Showing {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filteredTrips.length)}
          </span>
        )}
      </div>

      {/* ── No results ── */}
      {filteredTrips.length === 0 && (
        <NoSearchResults query={query} onClear={() => setQuery('')} />
      )}

      {/* ── Trip grid ── */}
      {filteredTrips.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pageTrips.map((trip, i) => (
              <TripCard key={trip.id} trip={trip} index={indexOffset + i} />
            ))}
          </div>

          {/* ── Pagination — only when needed ── */}
          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
              onPage={(n) => setPage(n)}
            />
          )}
        </>
      )}
    </div>
  );
}
