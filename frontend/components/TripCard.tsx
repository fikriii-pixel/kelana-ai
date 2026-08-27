import Link from 'next/link';
import { TripResponse } from '@/services/tripService';

// ── Public interfaces ─────────────────────────────────────────────────────────

export interface TripCardProps {
  trip: TripResponse;
  index?: number;
}

// ── Budget tier ───────────────────────────────────────────────────────────────

interface BudgetTier {
  label: string;
  icon: string;
  bg: string;
}

function getBudgetTier(budget: number): BudgetTier {
  if (budget < 1000) return { label: 'Backpacker', icon: '🎒', bg: 'bg-[#b8f0a0]' };
  if (budget <= 3000) return { label: 'Standard',  icon: '✈️', bg: 'bg-[#a0d4f0]' };
  return               { label: 'Luxury',     icon: '💎', bg: 'bg-[#e0baff]' };
}

// ── Travel style badge ────────────────────────────────────────────────────────

const STYLE_META: Record<string, { icon: string; bg: string }> = {
  solo:     { icon: '🧭', bg: 'bg-[#f9e07a]' },
  family:   { icon: '👨‍👩‍👧', bg: 'bg-[#f9a8d4]' },
  couple:   { icon: '💑', bg: 'bg-[#ffd6e7]' },
  luxury:   { icon: '💎', bg: 'bg-[#e0baff]' },
  budget:   { icon: '🎒', bg: 'bg-[#b8f0a0]' },
  business: { icon: '💼', bg: 'bg-[#a0d4f0]' },
};

function getTravelStyleMeta(style: string): { icon: string; bg: string } {
  return STYLE_META[style.toLowerCase()] ?? { icon: '🗺️', bg: 'bg-[#f4f4f0]' };
}

// ── Destination emoji flag ────────────────────────────────────────────────────

const DESTINATION_FLAGS: [RegExp, string][] = [
  [/japan|tokyo|osaka|kyoto/i,                '🇯🇵'],
  [/indonesia|bali|jakarta|lombok/i,          '🇮🇩'],
  [/france|paris/i,                           '🇫🇷'],
  [/italy|rome|venice|milan/i,                '🇮🇹'],
  [/spain|barcelona|madrid/i,                 '🇪🇸'],
  [/thailand|bangkok|phuket/i,                '🇹🇭'],
  [/usa|united states|new york|los angeles/i, '🇺🇸'],
  [/uk|united kingdom|london/i,               '🇬🇧'],
  [/australia|sydney|melbourne/i,             '🇦🇺'],
  [/singapore/i,                              '🇸🇬'],
  [/malaysia|kuala lumpur/i,                  '🇲🇾'],
  [/vietnam|hanoi|ho chi minh/i,              '🇻🇳'],
  [/korea|seoul/i,                            '🇰🇷'],
  [/china|beijing|shanghai/i,                 '🇨🇳'],
  [/india|delhi|mumbai/i,                     '🇮🇳'],
  [/turkey|istanbul/i,                        '🇹🇷'],
  [/greece|athens|santorini/i,                '🇬🇷'],
  [/portugal|lisbon|porto/i,                  '🇵🇹'],
  [/netherlands|amsterdam/i,                  '🇳🇱'],
  [/germany|berlin|munich/i,                  '🇩🇪'],
  [/switzerland|zurich|geneva/i,              '🇨🇭'],
  [/canada|toronto|vancouver/i,               '🇨🇦'],
  [/mexico|mexico city|cancun/i,              '🇲🇽'],
  [/brazil|rio|sao paulo/i,                   '🇧🇷'],
  [/egypt|cairo/i,                            '🇪🇬'],
  [/morocco|marrakech/i,                      '🇲🇦'],
  [/dubai|uae|abu dhabi/i,                    '🇦🇪'],
  [/new zealand|auckland/i,                   '🇳🇿'],
  [/maldives/i,                               '🇲🇻'],
  [/philippines|manila/i,                     '🇵🇭'],
];

function getDestinationFlag(destination: string): string {
  for (const [pattern, flag] of DESTINATION_FLAGS) {
    if (pattern.test(destination)) return flag;
  }
  return '📍';
}

// ── Currency formatter ────────────────────────────────────────────────────────

function formatBudget(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

// ── Header accent palette ─────────────────────────────────────────────────────

const HEADER_ACCENTS = [
  'bg-[#f9e07a]',
  'bg-[#a0d4f0]',
  'bg-[#b8f0a0]',
  'bg-[#f9a8d4]',
  'bg-[#e0baff]',
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function TripCard({ trip, index = 0 }: TripCardProps) {
  const headerBg   = HEADER_ACCENTS[index % HEADER_ACCENTS.length];
  const budgetTier = getBudgetTier(trip.budget);
  const styleMeta  = getTravelStyleMeta(trip.category);
  const flag       = getDestinationFlag(trip.destination);

  const formattedDate = new Date(trip.created_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });

  const preview = trip.ai_recommendation
    ? trip.ai_recommendation.replace(/[#*_`>]/g, '').trim().slice(0, 110).trimEnd() + '…'
    : 'No preview available.';

  return (
    <article className="group flex flex-col border-4 border-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 bg-white overflow-hidden">

      {/* ── Coloured header ── */}
      <div className={`${headerBg} border-b-4 border-black px-5 py-4`}>

        {/* Trip id + budget tier */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-black/50">
            Trip #{trip.id}
          </span>
          <span className={`flex items-center gap-1 ${budgetTier.bg} border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-[10px] font-black uppercase tracking-widest px-2 py-0.5`}>
            {budgetTier.icon} {budgetTier.label}
          </span>
        </div>

        {/* Destination + flag */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-2xl leading-none shrink-0" aria-hidden="true">{flag}</span>
          <h2 className="text-lg font-black text-black uppercase leading-tight truncate">
            {trip.destination}
          </h2>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-col flex-1 px-5 py-4 gap-4">

        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          <span className="flex items-center gap-1.5 border-2 border-black bg-[#f4f4f0] px-2.5 py-1 text-xs font-black tracking-wide shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            💰 {formatBudget(trip.budget)}
          </span>
          <span className="flex items-center gap-1.5 border-2 border-black bg-[#f4f4f0] px-2.5 py-1 text-xs font-black uppercase tracking-wide shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            📅 {trip.days} {trip.days === 1 ? 'day' : 'days'}
          </span>
          <span className={`flex items-center gap-1.5 ${styleMeta.bg} border-2 border-black px-2.5 py-1 text-xs font-black uppercase tracking-wide shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}>
            {styleMeta.icon} {trip.category}
          </span>
        </div>

        {/* Daily budget */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-black/40">Daily avg</span>
          <span className="border-2 border-black bg-black text-[#f9e07a] text-[10px] font-black uppercase tracking-widest px-2 py-0.5">
            {formatBudget(trip.daily_budget)}/day
          </span>
        </div>

        {/* AI preview */}
        <p className="text-xs text-gray-600 leading-relaxed border-l-4 border-black pl-3 bg-[#f9f9f6] py-2 pr-2 font-medium">
          {preview}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t-2 border-black/10">
          <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">
            {formattedDate}
          </span>
          <Link
            href={`/trips/${trip.id}`}
            className="border-2 border-black bg-black text-white text-xs font-black uppercase tracking-widest px-3 py-1.5 shadow-[3px_3px_0px_0px_rgba(249,224,122,1)] hover:bg-[#f9e07a] hover:text-black hover:shadow-none active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all duration-100"
          >
            View Details →
          </Link>
        </div>
      </div>
    </article>
  );
}
