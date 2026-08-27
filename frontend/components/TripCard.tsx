import Link from 'next/link';
import { TripResponse } from '@/services/tripService';

// ── Accent palette — cycles through cards ────────────────────────────────────

const ACCENTS = [
  { header: 'bg-[#f9e07a]', badge: 'bg-[#f9e07a]' }, // yellow
  { header: 'bg-[#a0d4f0]', badge: 'bg-[#a0d4f0]' }, // blue
  { header: 'bg-[#b8f0a0]', badge: 'bg-[#b8f0a0]' }, // green
  { header: 'bg-[#f9a8d4]', badge: 'bg-[#f9a8d4]' }, // pink
  { header: 'bg-[#e0baff]', badge: 'bg-[#e0baff]' }, // purple
];

const CATEGORY_BADGE: Record<string, string> = {
  Budget:   'bg-[#b8f0a0]',
  Standard: 'bg-[#a0d4f0]',
  Luxury:   'bg-[#f9e07a]',
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface TripCardProps {
  trip: TripResponse;
  index?: number; // used to pick the accent colour
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TripCard({ trip, index = 0 }: TripCardProps) {
  const accent = ACCENTS[index % ACCENTS.length];
  const catBg  = CATEGORY_BADGE[trip.category] ?? 'bg-[#e0baff]';

  const formattedDate = new Date(trip.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  // Truncate ai_recommendation preview to ~120 chars
  const preview = trip.ai_recommendation
    ? trip.ai_recommendation.replace(/[#*_`>]/g, '').slice(0, 120).trimEnd() + '…'
    : 'No preview available.';

  return (
    <article className="
      group flex flex-col
      border-4 border-black
      shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]
      hover:-translate-y-1
      hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]
      transition-all duration-150
      bg-white overflow-hidden
    ">
      {/* ── Coloured header strip ── */}
      <div className={`${accent.header} border-b-4 border-black px-5 py-4 flex items-start justify-between gap-3`}>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-black/50 mb-0.5">
            Trip #{trip.id}
          </p>
          <h2 className="text-lg font-black text-black uppercase leading-tight truncate">
            {trip.destination}
          </h2>
        </div>
        {/* Category badge */}
        <span className={`
          shrink-0 mt-0.5
          ${catBg} border-2 border-black
          text-[10px] font-black uppercase tracking-widest
          px-2 py-0.5
          shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
        `}>
          {trip.category}
        </span>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-col flex-1 px-5 py-4 gap-4">

        {/* Stats row */}
        <div className="flex flex-wrap gap-2">
          <span className="flex items-center gap-1.5 border-2 border-black bg-[#f4f4f0] px-2.5 py-1 text-xs font-black uppercase tracking-wide shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            📅 {trip.days} {trip.days === 1 ? 'day' : 'days'}
          </span>
          <span className="flex items-center gap-1.5 border-2 border-black bg-[#f4f4f0] px-2.5 py-1 text-xs font-black uppercase tracking-wide shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            💰 ${trip.budget.toLocaleString()}
          </span>
          <span className="flex items-center gap-1.5 border-2 border-black bg-[#f4f4f0] px-2.5 py-1 text-xs font-black uppercase tracking-wide shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            📆 ${trip.daily_budget.toFixed(0)}/day
          </span>
        </div>

        {/* AI preview */}
        <p className="text-xs text-gray-600 leading-relaxed border-l-4 border-black pl-3 bg-[#f9f9f6] py-2 pr-2 font-medium">
          {preview}
        </p>

        {/* Footer row */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t-2 border-black/10">
          <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">
            {formattedDate}
          </span>

          <Link
            href={`/trips/${trip.id}`}
            className="
              border-2 border-black
              bg-black text-white
              text-xs font-black uppercase tracking-widest
              px-3 py-1.5
              shadow-[3px_3px_0px_0px_rgba(249,224,122,1)]
              hover:bg-[#f9e07a] hover:text-black
              hover:shadow-none
              active:translate-x-[3px] active:translate-y-[3px] active:shadow-none
              transition-all duration-100
            "
          >
            View Details →
          </Link>
        </div>
      </div>
    </article>
  );
}
