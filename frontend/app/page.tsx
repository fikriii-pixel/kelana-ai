'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { generateTrip, TripRequestPayload, TripResponse } from '@/services/tripService';
import { parseItinerary, DaySection } from '@/lib/parseItinerary';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/lib/auth-context';

// ─── TypeScript Interfaces ────────────────────────────────────────────────────

interface TripFormData {
  destination: string;
  budget: string;
  days: string;
  travelStyle: string;
}

// ─── Travel styles config ─────────────────────────────────────────────────────

const TRAVEL_STYLES = [
  { value: 'Solo', label: 'Solo Explorer', icon: '🧭', description: 'Independent travel' },
  { value: 'Family', label: 'Family Trip', icon: '👨‍👩‍👧', description: 'Kid-friendly activities' },
  { value: 'Luxury', label: 'Luxury', icon: '💎', description: 'Premium experiences' },
  { value: 'Budget', label: 'Budget', icon: '🎒', description: 'Cost-conscious travel' },
];

// ─── Category color map ───────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Budget: { bg: 'bg-[#b8f0a0]', text: 'text-black', border: 'border-black' },
  Standard: { bg: 'bg-[#a0d4f0]', text: 'text-black', border: 'border-black' },
  Luxury: { bg: 'bg-[#f9e07a]', text: 'text-black', border: 'border-black' },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function BlockIcon({ heading }: { heading: string }) {
  const lower = heading.toLowerCase();
  if (lower.includes('morning')) return <>🌅</>;
  if (lower.includes('afternoon')) return <>☀️</>;
  if (lower.includes('evening') || lower.includes('night')) return <>🌙</>;
  return <>📍</>;
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-5 w-5 text-[#f9e07a]"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function SkeletonLoader() {
  return (
    <div className="mt-10 space-y-4 animate-pulse">
      <div className="border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6 bg-[#f4f4f0] space-y-3">
        <div className="h-5 bg-gray-300 rounded w-1/3" />
        <div className="h-4 bg-gray-300 rounded w-2/3" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 space-y-2 bg-[#f4f4f0]">
            <div className="h-3 bg-gray-300 rounded w-1/2" />
            <div className="h-5 bg-gray-300 rounded w-3/4" />
          </div>
        ))}
      </div>
      <div className="border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6 bg-[#f4f4f0] space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className={`h-3 bg-gray-300 rounded ${i % 3 === 2 ? 'w-1/2' : 'w-full'}`} />
        ))}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <div className={`border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 flex flex-col gap-1 ${color}`}>
      <span className="text-xs font-black uppercase tracking-widest flex items-center gap-1.5 text-black/70">
        {icon} {label}
      </span>
      <span className="text-base font-black text-black">{value}</span>
    </div>
  );
}

function DayCard({ day, index }: { day: DaySection; index: number }) {
  const colors = ['bg-[#f9e07a]', 'bg-[#a0d4f0]', 'bg-[#f9a8d4]', 'bg-[#b8f0a0]', 'bg-[#e0baff]'];
  const headerColor = colors[index % colors.length];

  return (
    <div className="border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden transition-all hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-[2px]">
      <div className={`px-5 py-3 border-b-4 border-black flex items-center gap-3 ${headerColor}`}>
        <span className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-black bg-black text-white text-xs font-black">
          {index + 1}
        </span>
        <h3 className="text-sm font-black text-black uppercase tracking-wide">{day.title}</h3>
      </div>
      <div className="divide-y-2 divide-black bg-white">
        {day.blocks.map((block, bi) => (
          <div key={bi} className="px-5 py-4 hover:bg-[#f4f4f0] transition-colors">
            <h4 className="flex items-center gap-2 text-xs font-black text-black uppercase tracking-widest mb-2.5 border-b-2 border-black/20 pb-1.5">
              <BlockIcon heading={block.heading} />
              {block.heading}
            </h4>
            <ul className="space-y-1.5">
              {block.items.map((item, ii) => (
                <li key={ii} className="flex gap-2 text-sm text-gray-800 leading-relaxed">
                  <span className="text-black font-black mt-0.5 shrink-0">›</span>
                  <span dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function RawRecommendation({ text }: { text: string }) {
  return (
    <div className="border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6 bg-white">
      <pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed font-sans">{text}</pre>
    </div>
  );
}

function ResultPanel({ trip }: { trip: TripResponse }) {
  const days = parseItinerary(trip.ai_recommendation ?? '');
  const hasParsed = days.length > 0;
  const catColors = CATEGORY_COLORS[trip.category] ?? CATEGORY_COLORS['Standard'];

  return (
    <div className="mt-10 space-y-4 result-enter">
      <div className="border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        <div className="bg-[#f9e07a] border-b-4 border-black px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-black/60 mb-0.5">✦ AI Itinerary Result</p>
            <h2 className="text-2xl font-black text-black uppercase">{trip.destination}</h2>
          </div>
          <span className={`inline-flex items-center gap-1.5 text-xs font-black px-3 py-1.5 border-2 ${catColors.border} ${catColors.bg} ${catColors.text} uppercase tracking-widest`}>
            <span className="w-2 h-2 rounded-full bg-black" />
            {trip.category}
          </span>
        </div>
        <div className="bg-white px-6 py-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
            Generated on{' '}
            {new Date(trip.created_at).toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric',
            })}
            {' '}· Trip #{trip.id}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon="📅" label="Duration" value={`${trip.days} days`} color="bg-[#a0d4f0]" />
        <StatCard icon="💰" label="Total Budget" value={`$${trip.budget.toLocaleString()}`} color="bg-[#f9e07a]" />
        <StatCard icon="📆" label="Daily Budget" value={`$${trip.daily_budget.toFixed(0)}/day`} color="bg-[#b8f0a0]" />
        <StatCard icon="✈️" label="Trip Style" value={trip.category} color="bg-[#f9a8d4]" />
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-[3px] bg-black" />
        <span className="text-xs font-black uppercase tracking-widest border-2 border-black px-3 py-1 bg-black text-white">
          Day-by-Day Itinerary
        </span>
        <div className="flex-1 h-[3px] bg-black" />
      </div>

      {hasParsed ? (
        <div className="space-y-3">
          {days.map((day, i) => (
            <DayCard key={i} day={day} index={i} />
          ))}
        </div>
      ) : (
        <RawRecommendation text={trip.ai_recommendation} />
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TripPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  const [formData, setFormData] = useState<TripFormData>({
    destination: '',
    budget: '',
    days: '',
    travelStyle: 'Solo',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TripResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    const payload: TripRequestPayload = {
      destination: formData.destination.trim(),
      budget: Number(formData.budget),
      days: Number(formData.days),
      travel_style: formData.travelStyle,
    };

    try {
      await generateTrip(payload);
      router.refresh();
      router.push('/trips');
    } catch (err: unknown) {
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Cannot reach the backend. Make sure the FastAPI server is running on http://localhost:8000.');
      } else {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f4f0]" style={{ fontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif" }}>

      {/* ── Navbar ── */}
      <Navbar 
        actionHref="/trips" 
        actionLabel="My Trips" 
        className={scrolled ? 'shadow-[0_4px_0px_0px_rgba(0,0,0,0.8)]' : ''}
      />

      {/* ── Hero Section ── */}
      <section className="relative w-full h-[480px] md:h-[560px] border-b-4 border-black overflow-hidden">
        <Image
          src="/hero.jpg"
          alt="Vibrant travel destination — Positano, Italy at sunset"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/70" />

        <div className="relative z-10 h-full flex flex-col justify-between p-6 md:p-10">
          {/* Top bar */}
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 bg-[#f9e07a] border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] px-3 py-1.5">
              <span className="text-xs font-black uppercase tracking-widest text-black">✦ KelanaAI</span>
            </div>
            <div className="flex gap-2">
              <span className="bg-[#a0d4f0] border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black text-xs font-black px-2.5 py-1 uppercase tracking-wide">
                🤖 AWS Bedrock
              </span>
              <span className="hidden sm:inline bg-[#f9a8d4] border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black text-xs font-black px-2.5 py-1 uppercase tracking-wide">
                ⚡ AI-Powered
              </span>
            </div>
          </div>

          {/* Hero text */}
          <div className="max-w-3xl">
            <div className="inline-block bg-black text-[#f9e07a] text-xs font-black uppercase tracking-widest px-3 py-1 mb-4 border-2 border-[#f9e07a]">
              ✈ Your AI Travel Companion
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-white uppercase leading-none tracking-tight drop-shadow-2xl">
              Plan Your
              <br />
              <span
                className="text-[#f9e07a]"
                style={{ WebkitTextStroke: '2px black', textShadow: '4px 4px 0 #000' }}
              >
                Dream Trip.
              </span>
            </h1>
            <p className="mt-4 text-white/90 text-sm sm:text-base md:text-lg font-bold max-w-md drop-shadow">
              Describe your journey — AI builds a personalised day-by-day itinerary in seconds.
            </p>
            <div className="flex flex-wrap gap-2 mt-6">
              {[
                { label: '50+ Destinations', color: 'bg-[#f9e07a]' },
                { label: 'Day-by-Day Plans', color: 'bg-[#b8f0a0]' },
                { label: 'Any Budget', color: 'bg-[#a0d4f0]' },
              ].map(({ label, color }) => (
                <span
                  key={label}
                  className={`${color} border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black text-xs font-black px-3 py-1.5 uppercase tracking-wide`}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Main Content ── */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

        {/* Form Card */}
        <div className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white overflow-hidden">
          <div className="bg-[#f9e07a] border-b-4 border-black px-6 py-4 flex items-center gap-3">
            <span className="text-2xl">🗺️</span>
            <div>
              <h2 className="text-lg font-black uppercase tracking-wide text-black">Trip Planner</h2>
              <p className="text-xs font-bold text-black/60 uppercase tracking-widest">Fill in your dream trip details</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5" noValidate>

            {/* Destination */}
            <div className="space-y-1.5">
              <label htmlFor="destination" className="block text-xs font-black uppercase tracking-widest text-black">
                📍 Destination
              </label>
              <input
                id="destination"
                name="destination"
                type="text"
                required
                autoComplete="off"
                placeholder="e.g. Tokyo, Japan"
                value={formData.destination}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-black bg-[#f4f4f0] text-sm font-bold text-black placeholder:text-gray-400 focus:outline-none focus:border-black focus:bg-[#f9e07a] transition-colors duration-150 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              />
            </div>

            {/* Budget + Days */}
            <div className="flex flex-col gap-4 md:grid md:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="budget" className="block text-xs font-black uppercase tracking-widest text-black">
                  💰 Budget (USD)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3.5 flex items-center text-black font-black text-sm pointer-events-none">$</span>
                  <input
                    id="budget"
                    name="budget"
                    type="number"
                    min="1"
                    required
                    placeholder="1500"
                    value={formData.budget}
                    onChange={handleChange}
                    className="w-full pl-8 pr-4 py-3 border-2 border-black bg-[#f4f4f0] text-sm font-bold text-black placeholder:text-gray-400 focus:outline-none focus:bg-[#a0d4f0] transition-colors duration-150 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="days" className="block text-xs font-black uppercase tracking-widest text-black">
                  📅 Duration (Days)
                </label>
                <input
                  id="days"
                  name="days"
                  type="number"
                  min="1"
                  max="30"
                  required
                  placeholder="5"
                  value={formData.days}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-black bg-[#f4f4f0] text-sm font-bold text-black placeholder:text-gray-400 focus:outline-none focus:bg-[#b8f0a0] transition-colors duration-150 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                />
              </div>
            </div>

            {/* Travel Style */}
            <div className="space-y-1.5">
              <label htmlFor="travelStyle" className="block text-xs font-black uppercase tracking-widest text-black">
                🎒 Travel Style
              </label>
              <select
                id="travelStyle"
                name="travelStyle"
                value={formData.travelStyle}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-black bg-[#f4f4f0] text-sm font-bold text-black focus:outline-none focus:bg-[#e0baff] transition-colors duration-150 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer appearance-none"
                style={{
                  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='black' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")",
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 14px center',
                }}
              >
                {TRAVEL_STYLES.map(({ value, label, icon }) => (
                  <option key={value} value={value}>{icon} {label}</option>
                ))}
              </select>
            </div>

            {/* Error banner */}
            {error && (
              <div className="flex items-start gap-3 px-4 py-3 border-2 border-black bg-[#ff6b6b] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-black text-sm font-bold result-enter">
                <span className="mt-0.5 shrink-0 text-lg">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 border-4 border-black bg-black text-[#f9e07a] text-sm font-black uppercase tracking-widest shadow-[6px_6px_0px_0px_rgba(249,224,122,1)] hover:bg-[#111] hover:shadow-[8px_8px_0px_0px_rgba(249,224,122,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-100 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Spinner />
                  Generating Itinerary…
                </>
              ) : (
                '✦ Generate AI Itinerary'
              )}
            </button>
          </form>
        </div>

        {/* Loading skeleton */}
        {isLoading && <SkeletonLoader />}

        {/* Result panel */}
        {!isLoading && result && <ResultPanel trip={result} />}

      </main>

      {/* ── Footer ── */}
      <footer className="border-t-4 border-black bg-black text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <div className="inline-flex items-center gap-2 bg-[#f9e07a] border-2 border-black shadow-[3px_3px_0px_0px_rgba(249,224,122,0.5)] px-3 py-1.5 mb-3">
                <span className="text-black text-sm font-black uppercase tracking-widest">✦ KelanaAI</span>
              </div>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">
                © 2026 KelanaAI. All rights reserved.
              </p>
              <p className="text-gray-500 text-xs mt-1">Powered by AWS Bedrock · Built with Next.js</p>
            </div>

            <nav className="flex flex-wrap justify-center gap-2">
              {[
                { label: 'About', color: 'bg-[#a0d4f0]' },
                { label: 'Docs', color: 'bg-[#b8f0a0]' },
                { label: 'GitHub', color: 'bg-[#e0baff]' },
                { label: 'Contact', color: 'bg-[#f9a8d4]' },
              ].map(({ label, color }) => (
                <a
                  key={label}
                  href="#"
                  className={`${color} border-2 border-black text-black text-xs font-black uppercase tracking-widest px-3 py-1.5 shadow-[2px_2px_0px_0px_rgba(255,255,255,0.3)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100`}
                >
                  {label}
                </a>
              ))}
            </nav>
          </div>

          <div className="border-t-2 border-white/10 mt-6 pt-4 text-center">
            <p className="text-gray-600 text-xs font-bold uppercase tracking-widest">
              Made with ❤️ · Neobrutalist Design System
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}