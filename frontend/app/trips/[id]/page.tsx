import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTrip } from '@/services/tripService';
import { parseItinerary, DaySection, DayBlock } from '@/lib/parseItinerary';

// ── Next.js App Router — async Server Component ───────────────────────────────

export const dynamic = 'force-dynamic';

// ── Route params type (Next.js 15 wraps params in a Promise) ─────────────────

interface PageProps {
  params: Promise<{ id: string }>;
}

// ── Design tokens ─────────────────────────────────────────────────────────────

const CATEGORY_HEADER: Record<string, string> = {
  Budget:   'bg-[#b8f0a0]',
  Standard: 'bg-[#a0d4f0]',
  Luxury:   'bg-[#f9e07a]',
};

const DAY_ACCENTS = [
  'bg-[#f9e07a]',
  'bg-[#a0d4f0]',
  'bg-[#b8f0a0]',
  'bg-[#f9a8d4]',
  'bg-[#e0baff]',
];

// ── Sub-components ────────────────────────────────────────────────────────────

function BlockIcon({ heading }: { heading: string }) {
  const h = heading.toLowerCase();
  if (h.includes('morning'))                   return <>🌅</>;
  if (h.includes('afternoon'))                 return <>☀️</>;
  if (h.includes('evening') || h.includes('night')) return <>🌙</>;
  if (h.includes('food') || h.includes('eat')) return <>🍜</>;
  if (h.includes('transport'))                 return <>🚌</>;
  if (h.includes('budget') || h.includes('cost')) return <>💰</>;
  return <>📍</>;
}

function StatBadge({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] px-4 py-3 flex flex-col gap-0.5">
      <span className="text-[10px] font-black uppercase tracking-widest text-black/50 flex items-center gap-1">
        {icon} {label}
      </span>
      <span className="text-base font-black text-black">{value}</span>
    </div>
  );
}

function DayCard({ day, index }: { day: DaySection; index: number }) {
  const accent = DAY_ACCENTS[index % DAY_ACCENTS.length];

  return (
    <section className="border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
      {/* Day header */}
      <div className={`${accent} border-b-4 border-black px-5 py-3 flex items-center gap-3`}>
        <span className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-black bg-black text-white text-xs font-black shrink-0">
          {index + 1}
        </span>
        <h3 className="text-sm font-black uppercase tracking-wide text-black leading-tight">
          {day.title}
        </h3>
      </div>

      {/* Time-of-day blocks */}
      <div className="divide-y-2 divide-black/10 bg-white">
        {day.blocks.map((block: DayBlock, bi: number) => (
          <div key={bi} className="px-5 py-4">
            <h4 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-black mb-3 pb-1.5 border-b-2 border-black/10">
              <BlockIcon heading={block.heading} />
              {block.heading}
            </h4>
            <ul className="space-y-2">
              {block.items.map((item: string, ii: number) => (
                <li key={ii} className="flex gap-2.5 text-sm text-gray-800 leading-relaxed">
                  <span className="font-black text-black mt-0.5 shrink-0 text-base leading-none">›</span>
                  <span
                    dangerouslySetInnerHTML={{
                      __html: item.replace(/\*\*(.*?)\*\*/g, '<strong class="font-black text-black">$1</strong>'),
                    }}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Day with no structured blocks — render raw */}
        {day.blocks.length === 0 && (
          <div className="px-5 py-4 text-sm text-gray-500 italic">No details available for this day.</div>
        )}
      </div>
    </section>
  );
}

function RawItinerary({ text }: { text: string }) {
  return (
    <div className="border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-white px-6 py-6">
      <pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed font-sans">{text}</pre>
    </div>
  );
}

// ── 404 state ─────────────────────────────────────────────────────────────────

function TripNotFound({ id }: { id: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white w-full max-w-md overflow-hidden">
        <div className="bg-[#ff6b6b] border-b-4 border-black px-6 py-4 flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-black/60">Error 404</p>
            <p className="text-sm font-black uppercase tracking-wide text-black">Trip Not Found</p>
          </div>
        </div>
        <div className="px-6 py-8 flex flex-col items-center text-center gap-5">
          <div className="text-5xl">🗺️</div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-black uppercase tracking-tight text-black">
              Trip #{id} doesnt exist
            </h2>
            <p className="text-sm font-bold text-gray-500 max-w-xs">
              This itinerary may have been deleted or the ID is invalid.
            </p>
          </div>
          <Link
            href="/trips"
            className="inline-flex items-center justify-center gap-2 w-full py-3 border-4 border-black bg-black text-[#f9e07a] text-sm font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(249,224,122,1)] hover:bg-[#111] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-100"
          >
            ← Back to Trip History
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function TripDetailPage({ params }: PageProps) {
  // Await params — required in Next.js 15 App Router
  const { id } = await params;
  const numericId = Number(id);

  // Guard: non-numeric IDs → 404
  if (!id || isNaN(numericId)) notFound();

  let trip: Awaited<ReturnType<typeof getTrip>> | null = null;
  let fetchError = false;

  try {
    trip = await getTrip(numericId);
  } catch {
    fetchError = true;
  }

  // Trip not found or API error
  if (fetchError || !trip) {
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{ backgroundColor: '#f4f4f0', fontFamily: "'Space Grotesk','Inter',system-ui,sans-serif" }}
      >
        <TripNotFound id={id} />
      </div>
    );
  }

  const days       = parseItinerary(trip.ai_recommendation ?? '');
  const hasParsed  = days.length > 0;
  const headerBg   = CATEGORY_HEADER[trip.category] ?? 'bg-[#f9e07a]';
  const createdAt  = new Date(trip.created_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: '#f4f4f0', fontFamily: "'Space Grotesk','Inter',system-ui,sans-serif" }}
    >
      {/* ── Top nav ── */}
      <header className="border-b-4 border-black bg-[#f9e07a]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            href="/trips"
            className="inline-flex items-center gap-2 border-2 border-black bg-black text-[#f9e07a] text-xs font-black uppercase tracking-widest px-3 py-1.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] hover:bg-[#222] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100"
          >
            ← Back to Trip History
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

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">

        {/* ── Hero card ── */}
        <div className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
          {/* Coloured banner */}
          <div className={`${headerBg} border-b-4 border-black px-6 py-6`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="inline-block bg-black text-[#f9e07a] text-[10px] font-black uppercase tracking-widest px-2.5 py-1 mb-3 border border-black">
                  ✈ AI Itinerary · Trip #{trip.id}
                </div>
                <h1 className="text-4xl sm:text-5xl font-black uppercase leading-none tracking-tight text-black">
                  {trip.destination}
                </h1>
                <p className="text-xs font-bold text-black/50 uppercase tracking-widest mt-2">
                  Generated on {createdAt}
                </p>
              </div>
              {/* Category badge */}
              <span className="border-2 border-black bg-black text-[#f9e07a] text-xs font-black uppercase tracking-widest px-3 py-1.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] self-start">
                {trip.category}
              </span>
            </div>
          </div>

          {/* Stats grid */}
          <div className="bg-[#f4f4f0] border-b-4 border-black px-4 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatBadge icon="📅" label="Duration"     value={`${trip.days} ${trip.days === 1 ? 'day' : 'days'}`} />
              <StatBadge icon="💰" label="Total Budget" value={`$${trip.budget.toLocaleString()}`} />
              <StatBadge icon="📆" label="Daily Budget" value={`$${trip.daily_budget.toFixed(0)}/day`} />
              <StatBadge icon="🧭" label="Travel Style" value={trip.category} />
            </div>
          </div>

          {/* Divider label */}
          <div className="bg-black px-6 py-2.5 flex items-center gap-3">
            <div className="flex-1 h-px bg-white/20" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#f9e07a]">
              Day-by-Day Itinerary
            </span>
            <div className="flex-1 h-px bg-white/20" />
          </div>
        </div>

        {/* ── Itinerary ── */}
        {hasParsed ? (
          <div className="space-y-4">
            {days.map((day, i) => (
              <DayCard key={i} day={day} index={i} />
            ))}
          </div>
        ) : (
          <RawItinerary text={trip.ai_recommendation} />
        )}

      </main>

      {/* ── Footer ── */}
      <footer className="border-t-4 border-black bg-black text-white mt-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
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
