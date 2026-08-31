'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/lib/toast-context';
import { useAuth } from '@/lib/auth-context';
import { useState, useEffect, useRef } from 'react';

// ── Props ─────────────────────────────────────────────────────────────────────

interface NavbarProps {
  /** Left-side back button label + href. Omit to hide. */
  backHref?: string;
  backLabel?: string;
  /** Right-side action button label + href. Omit to hide. */
  actionHref?: string;
  actionLabel?: string;
  /** Custom className for additional styling */
  className?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Navbar({
  backHref,
  backLabel = '← Back',
  actionHref,
  actionLabel,
  className = '',
}: NavbarProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const isAuthed = !isLoading && isAuthenticated;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    showToast('Signed out successfully.', 'info');
    logout();
    router.refresh();
    router.push('/login');
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header
        className={`sticky top-0 z-50 border-b-4 border-black transition-all duration-300 ${className} ${
          scrolled 
            ? 'bg-[#f9e07a]/95 backdrop-blur-md shadow-[0_4px_0px_0px_rgba(0,0,0,0.8)]' 
            : 'bg-[#f9e07a]'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          {/* ── Left Section ── */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {backHref ? (
              <Link
                href={backHref}
                className="inline-flex items-center gap-1.5 border-2 border-black bg-black text-[#f9e07a] text-xs font-black uppercase tracking-widest px-3 py-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] hover:bg-[#111] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100 truncate"
              >
                <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="truncate">{backLabel}</span>
              </Link>
            ) : (
              <div className="w-8 h-8 flex items-center justify-center">
                <span className="text-xs font-black text-black/30">✦</span>
              </div>
            )}
          </div>

          {/* ── Brand ── */}
          <Link
            href="/"
            className="flex items-center gap-2 text-base md:text-lg font-black uppercase tracking-widest text-black hover:scale-105 transition-transform duration-200 whitespace-nowrap flex-shrink-0"
          >
            <span className="bg-black text-[#f9e07a] px-2 py-0.5 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] text-sm md:text-base">✦</span>
            <span className="hidden sm:inline">KelanaAI</span>
            <span className="sm:hidden">KAI</span>
          </Link>

          {/* ── Right Section ── */}
          <div className="flex items-center justify-end gap-1.5 flex-1 min-w-0">
            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center gap-1.5">
              {/* Greeting */}
              {isAuthed && user && (
                <div className="flex items-center gap-2 px-3 py-1.5 border-2 border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)]">
                  <span className="text-sm font-bold text-black truncate max-w-[120px]">
                    👋 {user.name.split(' ')[0]}
                  </span>
                </div>
              )}

              {/* Action Button */}
              {actionHref && actionLabel && (
                <Link
                  href={actionHref}
                  className="inline-flex items-center gap-1.5 border-2 border-black bg-white text-black text-xs font-black uppercase tracking-widest px-3 py-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-[#b8f0a0] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100 truncate"
                >
                  {actionLabel}
                </Link>
              )}

              {/* Authenticated Actions */}
              {isAuthed && (
                <>
                  <Link
                    href="/assistant"
                    className="inline-flex items-center gap-1.5 border-2 border-black bg-[#FFE600] hover:bg-yellow-300 text-black text-xs font-black uppercase tracking-widest px-3 py-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100"
                  >
                    🤖 <span className="hidden xl:inline">Ask AI</span>
                  </Link>
                  <Link
                    href="/profile"
                    className="inline-flex items-center gap-1.5 border-2 border-black bg-[#b8f0a0] hover:bg-[#a0e080] text-black text-xs font-black uppercase tracking-widest px-3 py-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100"
                  >
                    👤
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center gap-1.5 border-2 border-black bg-red-400 hover:bg-red-500 text-black text-xs font-bold uppercase tracking-widest px-3 py-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100"
                    aria-label="Logout"
                  >
                    🚪
                  </button>
                </>
              )}

              {/* Unauthenticated Actions */}
              {!isAuthed && (
                <>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 border-2 border-black bg-white text-black text-xs font-black uppercase tracking-widest px-3 py-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-[#b8f0a0] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-1.5 border-2 border-black bg-black text-[#f9e07a] text-xs font-black uppercase tracking-widest px-3 py-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] hover:bg-[#111] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>

            {/* Mobile: Show icons only */}
            <div className="flex lg:hidden items-center gap-1.5">
              {isAuthed && (
                <>
                  <Link
                    href="/assistant"
                    className="inline-flex items-center justify-center border-2 border-black bg-[#FFE600] hover:bg-yellow-300 text-black text-sm font-black w-9 h-9 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all duration-100"
                    aria-label="Ask AI Assistant"
                  >
                    🤖
                  </Link>
                  <Link
                    href="/profile"
                    className="inline-flex items-center justify-center border-2 border-black bg-[#b8f0a0] hover:bg-[#a0e080] text-black text-sm font-black w-9 h-9 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all duration-100"
                    aria-label="Profile"
                  >
                    👤
                  </Link>
                </>
              )}
            </div>

            {/* ── Mobile Hamburger ── */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex flex-col gap-1.5 p-2 border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-[#f4f4f0] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all duration-100 lg:hidden"
              aria-label="Toggle menu"
            >
              <span className={`block w-5 h-0.5 bg-black transition-all duration-300 ${isMobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
              <span className={`block w-5 h-0.5 bg-black transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0' : ''}`} />
              <span className={`block w-5 h-0.5 bg-black transition-all duration-300 ${isMobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile Menu ── */}
      <div
        ref={menuRef}
        className={`lg:hidden fixed inset-x-0 top-[57px] z-40 border-b-4 border-black bg-[#f9e07a] shadow-[0_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-300 overflow-hidden ${
          isMobileMenuOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 py-4 space-y-3">
          {/* Greeting */}
          {isAuthed && user && (
            <div className="flex items-center gap-2 px-4 py-3 border-2 border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)]">
              <span className="text-base font-bold text-black">
                👋 Hello, {user.name.split(' ')[0]}!
              </span>
            </div>
          )}

          {/* Action Button */}
          {actionHref && actionLabel && (
            <Link
              href={actionHref}
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full border-2 border-black bg-white text-black text-sm font-black uppercase tracking-widest px-4 py-3.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-[#b8f0a0] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100"
            >
              {actionLabel}
            </Link>
          )}

          {/* Authenticated Mobile Links */}
          {isAuthed && (
            <>
              <Link
                href="/assistant"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full border-2 border-black bg-[#FFE600] hover:bg-yellow-300 text-black text-sm font-black uppercase tracking-widest px-4 py-3.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100"
              >
                🤖 Ask AI Assistant
              </Link>
              <Link
                href="/profile"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full border-2 border-black bg-[#b8f0a0] hover:bg-[#a0e080] text-black text-sm font-black uppercase tracking-widest px-4 py-3.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100"
              >
                👤 Profile
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 w-full border-2 border-black bg-red-400 hover:bg-red-500 text-black text-sm font-black uppercase tracking-widest px-4 py-3.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100"
              >
                🚪 Logout
              </button>
            </>
          )}

          {/* Unauthenticated Mobile Links */}
          {!isAuthed && (
            <>
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full border-2 border-black bg-white text-black text-sm font-black uppercase tracking-widest px-4 py-3.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-[#b8f0a0] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100"
              >
                Login
              </Link>
              <Link
                href="/register"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full border-2 border-black bg-black text-[#f9e07a] text-sm font-black uppercase tracking-widest px-4 py-3.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] hover:bg-[#111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}