import Link from 'next/link';

// ── Decorative SVG suitcase — drawn in neobrutalist style ─────────────────────

function SuitcaseIllustration() {
  return (
    <svg
      viewBox="0 0 160 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-36 h-32 mx-auto"
      aria-hidden="true"
    >
      {/* Drop shadow rect */}
      <rect x="18" y="38" width="124" height="88" rx="6" fill="black" />
      {/* Body */}
      <rect x="14" y="34" width="124" height="88" rx="6" fill="#f9e07a" stroke="black" strokeWidth="4" />
      {/* Body stripes */}
      <rect x="14" y="62" width="124" height="14" fill="#f0d060" stroke="black" strokeWidth="0" />
      {/* Handle base */}
      <rect x="56" y="16" width="48" height="22" rx="10" fill="#a0d4f0" stroke="black" strokeWidth="4" />
      {/* Handle inner cut */}
      <rect x="66" y="22" width="28" height="10" rx="5" fill="#f4f4f0" stroke="black" strokeWidth="3" />
      {/* Locks left */}
      <rect x="30" y="68" width="14" height="10" rx="2" fill="black" />
      <rect x="33" y="71" width="8" height="4" rx="1" fill="#f9e07a" />
      {/* Locks right */}
      <rect x="116" y="68" width="14" height="10" rx="2" fill="black" />
      <rect x="119" y="71" width="8" height="4" rx="1" fill="#f9e07a" />
      {/* Wheels */}
      <circle cx="38"  cy="124" r="8" fill="black" />
      <circle cx="38"  cy="124" r="4" fill="#f4f4f0" />
      <circle cx="122" cy="124" r="8" fill="black" />
      <circle cx="122" cy="124" r="4" fill="#f4f4f0" />
      {/* Question marks — hinting "nothing here yet" */}
      <text x="68" y="104" fontSize="24" fontWeight="900" fill="black" fontFamily="monospace">?</text>
    </svg>
  );
}

// ── Decorative background squiggles ──────────────────────────────────────────

function DecoSquiggles() {
  return (
    <>
      {/* top-left star */}
      <span
        className="absolute -top-4 -left-4 text-3xl font-black text-black select-none"
        aria-hidden="true"
      >
        ✦
      </span>
      {/* bottom-right dot grid */}
      <span
        className="absolute -bottom-3 -right-3 w-10 h-10 grid grid-cols-2 gap-1 select-none"
        aria-hidden="true"
      >
        {[...Array(4)].map((_, i) => (
          <span key={i} className="w-2 h-2 rounded-full bg-black block" />
        ))}
      </span>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">

      {/* Outer accent frame */}
      <div className="relative w-full max-w-lg">
        <DecoSquiggles />

        {/* Card */}
        <div className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">

          {/* Coloured header banner */}
          <div className="bg-[#f9e07a] border-b-4 border-black px-8 py-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-black/50 mb-0.5">
                Status
              </p>
              <p className="text-sm font-black uppercase tracking-wide text-black">
                Archive Empty
              </p>
            </div>
            <span className="border-2 border-black bg-black text-[#f9e07a] text-[10px] font-black uppercase tracking-widest px-2.5 py-1 shadow-[2px_2px_0px_0px_rgba(249,224,122,0.5)]">
              0 Trips
            </span>
          </div>

          {/* Body */}
          <div className="bg-white px-8 py-10 flex flex-col items-center text-center gap-6">

            {/* Illustration */}
            <div className="border-4 border-black bg-[#f4f4f0] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-5 w-fit">
              <SuitcaseIllustration />
            </div>

            {/* Text */}
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black leading-tight">
                Your Passport<br />Looks Empty!
              </h2>
              <p className="text-sm font-bold text-gray-500 max-w-xs mx-auto leading-relaxed">
                You haven't created any itineraries yet. Let AI plan your next adventure — just fill in your destination and budget.
              </p>
            </div>

            {/* Feature chips */}
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { icon: '🤖', label: 'AI-Powered'      },
                { icon: '📅', label: 'Day-by-Day Plan'  },
                { icon: '💰', label: 'Budget-Aware'     },
              ].map(({ icon, label }) => (
                <span
                  key={label}
                  className="flex items-center gap-1.5 border-2 border-black bg-[#f4f4f0] px-3 py-1 text-xs font-black uppercase tracking-wide shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                >
                  {icon} {label}
                </span>
              ))}
            </div>

            {/* CTA */}
            <Link
              href="/"
              className="
                inline-flex items-center justify-center gap-2
                w-full sm:w-auto
                px-8 py-3.5
                border-4 border-black
                bg-yellow-400 hover:bg-yellow-300
                text-black text-sm font-black uppercase tracking-widest
                shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]
                hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]
                hover:-translate-y-0.5
                active:translate-x-[4px] active:translate-y-[4px] active:shadow-none
                transition-all duration-100
              "
            >
              Plan Your First Trip 🚀
            </Link>

            {/* Hint */}
            <p className="text-[10px] font-bold text-black/30 uppercase tracking-widest">
              No sign-up required · Instant results
            </p>

          </div>
        </div>
      </div>
    </div>
  );
}
