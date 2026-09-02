'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { setToken, getToken } from '@/lib/api';
import { useToast } from '@/lib/toast-context';
import { useAuth } from '@/lib/auth-context';

// ── Types ─────────────────────────────────────────────────────────────────────

interface LoginForm {
  email: string;
  password: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
}

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5 text-[#f9e07a]" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { fetchUserProfile } = useAuth();

  const [form, setForm] = useState<LoginForm>({ email: '', password: '' });
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);

  // Already logged in — skip to trips
  useEffect(() => {
    if (getToken()) { router.replace('/trips'); return; }
    // Coming from /register — show welcome message
    if (searchParams.get('registered') === '1') {
      showToast('Account created! Sign in to start planning.', 'success');
    }
  }, [router, searchParams, showToast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('http://localhost:8000/api/v1/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: form.email.trim(), password: form.password }),
      });

      if (res.status === 401 || res.status === 400) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.detail ?? 'Invalid email or password.');
      }

      if (!res.ok) {
        throw new Error(`Server error: ${res.status} ${res.statusText}`);
      }

      const data: TokenResponse = await res.json();
      setToken(data.access_token);

      document.cookie = `auth-token=${data.access_token}; path=/; max-age=3600`;
      
      // Fetch user profile from /api/v1/auth/me
      await fetchUserProfile();
      
      showToast('Welcome back! Loading your trips…', 'success');
      router.push('/trips');

    } catch (err: unknown) {
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Cannot reach the backend. Make sure the FastAPI server is running on http://localhost:8000.');
      } else {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      }
      setLoading(false);
    }
  };

  return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#f4f4f0', fontFamily: "'Space Grotesk','Inter',system-ui,sans-serif" }}>
      {/* ── Nav ── */}
      <header className="border-b-4 border-black bg-[#f9e07a]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 border-2 border-black bg-black text-[#f9e07a] text-xs font-black uppercase tracking-widest px-3 py-1.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] hover:bg-[#111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100"
          >
            ← Home
          </Link>
          <span className="text-sm font-black uppercase tracking-widest text-black">✦ KelanaAI</span>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 border-2 border-black bg-white text-black text-xs font-black uppercase tracking-widest px-3 py-1.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-[#b8f0a0] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100"
          >
            Register
          </Link>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 flex items-center justify-center px-4 py-14">
        <div className="w-full max-w-md">

          {/* Hero label */}
          <div className="mb-6 text-center">
            <div className="inline-block bg-black text-[#f9e07a] text-[10px] font-black uppercase tracking-widest px-3 py-1 mb-4 border-2 border-black">
              ✦ Welcome Back
            </div>
            <h1 className="text-4xl font-black uppercase tracking-tight text-black leading-none">
              Sign In to<br />
              <span
                className="text-[#f9e07a]"
                style={{ WebkitTextStroke: '2px black', textShadow: '3px 3px 0 #000' }}
              >
                KelanaAI
              </span>
            </h1>
            <p className="mt-3 text-sm font-bold text-black/50 uppercase tracking-widest">
              Your AI travel companion awaits
            </p>
          </div>

          {/* Form card */}
          <div className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white overflow-hidden">

            {/* Card header */}
            <div className="bg-[#f9e07a] border-b-4 border-black px-6 py-4 flex items-center gap-3">
              <span className="text-2xl">🔐</span>
              <div>
                <p className="text-sm font-black uppercase tracking-wide text-black">Login</p>
                <p className="text-[10px] font-bold text-black/50 uppercase tracking-widest">Enter your credentials</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5" noValidate>

              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-xs font-black uppercase tracking-widest text-black">
                  📧 Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="alice@kelana.ai"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-black bg-[#f4f4f0] text-sm font-bold text-black placeholder:text-gray-400 focus:outline-none focus:bg-[#f9e07a] transition-colors duration-150 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-xs font-black uppercase tracking-widest text-black">
                  🔑 Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPass ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={handleChange}
                    className="w-full px-4 py-3 pr-12 border-2 border-black bg-[#f4f4f0] text-sm font-bold text-black placeholder:text-gray-400 focus:outline-none focus:bg-[#a0d4f0] transition-colors duration-150 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(p => !p)}
                    className="absolute inset-y-0 right-3 flex items-center text-black/40 hover:text-black transition-colors text-sm font-black"
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                  >
                    {showPass ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Error banner */}
              {error && (
                <div className="flex items-start gap-3 px-4 py-3 border-2 border-black bg-[#ff6b6b] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-black text-sm font-bold">
                  <span className="shrink-0 text-lg mt-0.5">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 border-4 border-black bg-black text-[#f9e07a] text-sm font-black uppercase tracking-widest shadow-[6px_6px_0px_0px_rgba(249,224,122,1)] hover:bg-[#111] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-100 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <><Spinner /> Signing In…</>
                ) : (
                  '✦ Sign In'
                )}
              </button>

              {/* Register link */}
              <p className="text-center text-xs font-bold text-black/50 uppercase tracking-widest pt-1">
                No account?{' '}
                <Link
                  href="/register"
                  className="text-black underline underline-offset-2 hover:bg-[#f9e07a] transition-colors"
                >
                  Register here
                </Link>
              </p>

            </form>
          </div>

          {/* Decorative badges */}
          <div className="flex justify-center gap-2 mt-6">
            {[
              { label: '🔒 Secure JWT', color: 'bg-[#b8f0a0]' },
              { label: '⚡ AI-Powered', color: 'bg-[#a0d4f0]' },
              { label: '✈ Travel AI',  color: 'bg-[#f9a8d4]' },
            ].map(({ label, color }) => (
              <span
                key={label}
                className={`${color} border-2 border-black text-black text-[10px] font-black uppercase tracking-widest px-2.5 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}
              >
                {label}
              </span>
            ))}
          </div>

        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t-4 border-black bg-black text-white">
        <div className="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between">
          <span className="bg-[#f9e07a] border-2 border-black px-2.5 py-1 text-black text-xs font-black uppercase tracking-widest">
            ✦ KelanaAI
          </span>
          <p className="text-gray-600 text-xs font-bold uppercase tracking-widest">
            Powered by AWS Bedrock · Next.js
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#f4f4f0] text-black font-black uppercase tracking-widest">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
