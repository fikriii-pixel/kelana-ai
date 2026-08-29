'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getToken, clearToken } from '@/lib/api';
import { useToast } from '@/lib/toast-context';
import { useAuth } from '@/lib/auth-context';

// ── Props ─────────────────────────────────────────────────────────────────────

interface NavbarProps {
  /** Left-side back button label + href. Omit to hide. */
  backHref?: string;
  backLabel?: string;
  /** Right-side action button label + href. Omit to hide. */
  actionHref?: string;
  actionLabel?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Navbar({
  backHref,
  backLabel = '← Back',
  actionHref,
  actionLabel,
}: NavbarProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { user, logout } = useAuth();

  // Read token client-side only — avoids SSR mismatch
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    setIsAuthed(!!getToken());
  }, []);

  const handleLogout = () => {
    // 1. Show feedback toast
    showToast('Signed out successfully.', 'info');

    // 2. Clear auth state
    logout();

    // 3. Invalidate any Next.js router cache so stale authenticated
    //    UI state isn't served from the client-side cache
    router.refresh();

    // 4. Redirect to login
    router.push('/login');
  };

  return (
    <header className="border-b-4 border-black bg-[#f9e07a]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">

        {/* ── Left — back button ── */}
        <div className="flex-1 flex items-center">
          {backHref ? (
            <Link
              href={backHref}
              className="inline-flex items-center gap-2 border-2 border-black bg-black text-[#f9e07a] text-xs font-black uppercase tracking-widest px-3 py-1.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] hover:bg-[#111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100"
            >
              {backLabel}
            </Link>
          ) : (
            <span /> /* spacer */
          )}
        </div>

        {/* ── Centre — brand ── */}
        <Link
          href="/"
          className="text-sm font-black uppercase tracking-widest text-black hover:underline underline-offset-2 whitespace-nowrap"
        >
          ✦ KelanaAI
        </Link>

        {/* ── Right — personalized greeting + action + conditional logout ── */}
        <div className="flex-1 flex items-center justify-end gap-2">
          {/* Personalized greeting badge — only when authenticated */}
          {isAuthed && user && (
            <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 border-2 border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)]">
              <span className="text-sm font-bold text-black">Welcome back, {user.name.split(' ')[0]} 👋</span>
            </div>
          )}

          {/* Profile link — only when authenticated */}
          {isAuthed && (
            <Link
              href="/profile"
              className="inline-flex items-center gap-1.5 border-2 border-black bg-[#b8f0a0] hover:bg-[#a0e080] text-black text-xs font-black uppercase tracking-widest px-3 py-1.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100"
              aria-label="Go to profile"
            >
              👤 Profile
            </Link>
          )}

          {actionHref && actionLabel && (
            <Link
              href={actionHref}
              className="inline-flex items-center gap-1.5 border-2 border-black bg-white text-black text-xs font-black uppercase tracking-widest px-3 py-1.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-[#b8f0a0] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100"
            >
              {actionLabel}
            </Link>
          )}

          {/* Logout — only rendered when a token exists */}
          {isAuthed && (
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 border-2 border-black bg-red-400 hover:bg-red-500 text-black text-xs font-bold uppercase tracking-widest px-4 py-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100"
              aria-label="Log out of KelanaAI"
            >
              🚪 Logout
            </button>
          )}

          {/* Login / Register links — only when not authenticated */}
          {!isAuthed && (
            <>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 border-2 border-black bg-white text-black text-xs font-black uppercase tracking-widest px-3 py-1.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-[#b8f0a0] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 border-2 border-black bg-black text-[#f9e07a] text-xs font-black uppercase tracking-widest px-3 py-1.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] hover:bg-[#111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100"
              >
                Register
              </Link>
            </>
          )}
        </div>

      </div>
    </header>
  );
}
