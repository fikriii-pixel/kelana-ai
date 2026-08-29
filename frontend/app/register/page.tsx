'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getToken } from '@/lib/api';
import { useToast } from '@/lib/toast-context';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface RegisterResponse {
  id: number;
  name: string;
  email: string;
  created_at: string;
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

export default function RegisterPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [form, setForm]         = useState<RegisterForm>({ name: '', email: '', password: '', confirmPassword: '' });
  const [isLoading, setLoading] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Already logged in → skip to trips
  useEffect(() => {
    if (getToken()) router.replace('/trips');
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // ── Client-side validation ────────────────────────────────────────────────
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('http://localhost:8000/api/v1/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name:     form.name.trim(),
          email:    form.email.trim().toLowerCase(),
          password: form.password,
        }),
      });

      if (res.status === 400) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.detail ?? 'This email is already registered.');
      }
      if (res.status === 422) {
        const body = await res.json().catch(() => ({}));
        const msg = body?.detail?.[0]?.msg ?? 'Invalid input. Please check your details.';
        throw new Error(msg);
      }
      if (!res.ok) {
        throw new Error(`Server error: ${res.status} ${res.statusText}`);
      }

      const data: RegisterResponse = await res.json();

      // ── Success — redirect to login with a success flag ───────────────────
      showToast(`Welcome, ${data.name}! Please sign in to continue.`, 'success');
      router.push('/login?registered=1');

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
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: '#f4f4f0', fontFamily: "'Space Grotesk','Inter',system-ui,sans-serif" }}
    >
      {/* ── Nav ── */}
      <header className="border-b-4 border-black bg-[#b8f0a0]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 border-2 border-black bg-black text-[#b8f0a0] text-xs font-black uppercase tracking-widest px-3 py-1.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] hover:bg-[#111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100"
          >
            ← Home
          </Link>
          <span className="text-sm font-black uppercase tracking-widest text-black">✦ KelanaAI</span>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 border-2 border-black bg-white text-black text-xs font-black uppercase tracking-widest px-3 py-1.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-[#f9e07a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 flex items-center justify-center px-4 py-14">
        <div className="w-full max-w-md">

          {/* Hero label */}
          <div className="mb-6 text-center">
            <div className="inline-block bg-black text-[#b8f0a0] text-[10px] font-black uppercase tracking-widest px-3 py-1 mb-4 border-2 border-black">
              ✦ Join KelanaAI
            </div>
            <h1 className="text-4xl font-black uppercase tracking-tight text-black leading-none">
              Create Your<br />
              <span
                className="text-[#b8f0a0]"
                style={{ WebkitTextStroke: '2px black', textShadow: '3px 3px 0 #000' }}
              >
                Account
              </span>
            </h1>
            <p className="mt-3 text-sm font-bold text-black/50 uppercase tracking-widest">
              Start planning your AI-powered adventures
            </p>
          </div>

          {/* Form card */}
          <div className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white overflow-hidden">

            {/* Card header */}
            <div className="bg-[#b8f0a0] border-b-4 border-black px-6 py-4 flex items-center gap-3">
              <span className="text-2xl">🚀</span>
              <div>
                <p className="text-sm font-black uppercase tracking-wide text-black">Register</p>
                <p className="text-[10px] font-bold text-black/50 uppercase tracking-widest">Create your free account</p>
              </div>
            </div>

            <form id="register-form" onSubmit={handleSubmit} className="px-6 py-6 space-y-5" noValidate>

              {/* Name */}
              <div className="space-y-1.5">
                <label htmlFor="name" className="block text-xs font-black uppercase tracking-widest text-black">
                  👤 Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="Alice Johnson"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-black bg-[#f4f4f0] text-sm font-bold text-black placeholder:text-gray-400 focus:outline-none focus:bg-[#b8f0a0] transition-colors duration-150 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                />
              </div>

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
                  placeholder="alice@email.com"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-black bg-[#f4f4f0] text-sm font-bold text-black placeholder:text-gray-400 focus:outline-none focus:bg-[#f9e07a] transition-colors duration-150 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="register-password" className="block text-xs font-black uppercase tracking-widest text-black">
                  🔑 Password
                  <span className="ml-2 text-[9px] font-bold text-black/40 normal-case">(min 8 characters)</span>
                </label>
                <div className="relative">
                  <input
                    id="register-password"
                    name="password"
                    type={showPass ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={handleChange}
                    className="w-full px-4 py-3 pr-12 border-2 border-black bg-[#f4f4f0] text-sm font-bold text-black placeholder:text-gray-400 focus:outline-none focus:bg-[#a0d4f0] transition-colors duration-150 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  />
                  <button
                    type="button"
                    id="toggle-password"
                    onClick={() => setShowPass(p => !p)}
                    className="absolute inset-y-0 right-3 flex items-center text-black/40 hover:text-black transition-colors text-sm font-black"
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                  >
                    {showPass ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label htmlFor="confirm-password" className="block text-xs font-black uppercase tracking-widest text-black">
                  🔒 Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirm-password"
                    name="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    className="w-full px-4 py-3 pr-12 border-2 border-black bg-[#f4f4f0] text-sm font-bold text-black placeholder:text-gray-400 focus:outline-none focus:bg-[#a0d4f0] transition-colors duration-150 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  />
                  <button
                    type="button"
                    id="toggle-confirm-password"
                    onClick={() => setShowConfirm(p => !p)}
                    className="absolute inset-y-0 right-3 flex items-center text-black/40 hover:text-black transition-colors text-sm font-black"
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? '🙈' : '👁️'}
                  </button>
                </div>

                {/* Live password match indicator */}
                {form.confirmPassword.length > 0 && (
                  <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${form.password === form.confirmPassword ? 'text-green-700' : 'text-red-600'}`}>
                    {form.password === form.confirmPassword ? '✓ Passwords match' : '✕ Passwords do not match'}
                  </p>
                )}
              </div>

              {/* Error banner */}
              {error && (
                <div id="register-error" className="flex items-start gap-3 px-4 py-3 border-2 border-black bg-[#ff6b6b] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-black text-sm font-bold">
                  <span className="shrink-0 text-lg mt-0.5">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                id="register-submit"
                type="submit"
                disabled={isLoading}
                className="w-full py-4 border-4 border-black bg-black text-[#b8f0a0] text-sm font-black uppercase tracking-widest shadow-[6px_6px_0px_0px_rgba(184,240,160,1)] hover:bg-[#111] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-100 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <><Spinner /> Creating Account…</>
                ) : (
                  '✦ Create Account'
                )}
              </button>

              {/* Login link */}
              <p className="text-center text-xs font-bold text-black/50 uppercase tracking-widest pt-1">
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="text-black underline underline-offset-2 hover:bg-[#f9e07a] transition-colors"
                >
                  Sign in here
                </Link>
              </p>

            </form>
          </div>

          {/* Decorative badges */}
          <div className="flex justify-center gap-2 mt-6">
            {[
              { label: '🔒 Bcrypt Hashed', color: 'bg-[#b8f0a0]' },
              { label: '⚡ JWT Auth',       color: 'bg-[#a0d4f0]' },
              { label: '✈ Travel AI',       color: 'bg-[#f9a8d4]' },
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
          <span className="bg-[#b8f0a0] border-2 border-black px-2.5 py-1 text-black text-xs font-black uppercase tracking-widest">
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
