'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';

// ── Loading Skeleton ──────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="border-4 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden animate-pulse">
        {/* Header */}
        <div className="bg-[#f9e07a] border-b-4 border-black px-6 py-6 flex items-center gap-4">
          <div className="w-16 h-16 bg-black rounded-full" />
          <div className="flex-1">
            <div className="h-6 bg-black w-1/3 mb-2" />
            <div className="h-4 bg-black/50 w-1/2" />
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-black/30 w-1/4" />
              <div className="h-6 bg-black/10 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const { showToast } = useToast();
  const [isLogoutLoading, setLogoutLoading] = useState(false);

  // Redirect to login if no token/user after loading
  useEffect(() => {
    if (!isLoading && !user) {
      showToast('Please log in to view your profile.', 'info');
      router.replace('/login');
    }
  }, [isLoading, user, router, showToast]);

  const handleLogout = async () => {
    setLogoutLoading(true);
    showToast('Signing out…', 'info');
    logout();
    router.refresh();
    router.push('/login');
  };

  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="flex-1 flex items-center justify-center bg-[#f4f4f0]">
          <ProfileSkeleton />
        </main>
      </>
    );
  }

  if (!user) {
    return null; // Redirect is happening in useEffect
  }

  return (
    <>
      <Navbar />
      <main
        className="flex-1 bg-[#f4f4f0] py-8 sm:py-12"
        style={{ fontFamily: "'Space Grotesk','Inter',system-ui,sans-serif" }}
      >
        <div className="max-w-2xl mx-auto px-4">
          {/* Profile Card */}
          <div className="border-4 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
            {/* Card Header with Avatar */}
            <div className="bg-[#f9e07a] border-b-4 border-black px-6 sm:px-8 py-8 flex items-center gap-6">
              <div className="flex-shrink-0 w-20 h-20 bg-black text-[#f9e07a] border-4 border-black rounded-full flex items-center justify-center text-4xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]">
                👤
              </div>
              <div>
                <h1 className="text-3xl font-black uppercase tracking-tight text-black leading-none">
                  {user.name}
                </h1>
                <p className="mt-2 text-sm font-bold text-black/60 uppercase tracking-widest">
                  Your Profile
                </p>
              </div>
            </div>

            {/* Card Content */}
            <div className="px-6 sm:px-8 py-8 space-y-8">
              {/* Email Section */}
              <div className="border-l-4 border-black pl-4">
                <p className="text-xs font-black uppercase tracking-widest text-black/50 mb-2">
                  Email Address
                </p>
                <p className="text-lg font-bold text-black">
                  {user.email}
                </p>
              </div>

              {/* Trips Stat Counter */}
              <div className="border-4 border-black bg-[#f9e07a] p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]">
                <p className="text-xs font-black uppercase tracking-widest text-black/60 mb-3">
                  Trips Generated
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-black">
                    {user.total_trips}
                  </span>
                  <span className="text-sm font-bold text-black/70 uppercase tracking-widest">
                    {user.total_trips === 1 ? 'Trip' : 'Trips'}
                  </span>
                </div>
              </div>

              {/* User ID Section */}
              <div className="border-l-4 border-black pl-4">
                <p className="text-xs font-black uppercase tracking-widest text-black/50 mb-2">
                  User ID
                </p>
                <p className="font-mono text-sm font-bold text-black bg-black/5 px-3 py-2 border-2 border-black/20">
                  {user.id}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t-4 border-black">
                {/* View My Trips Button */}
                <Link
                  href="/trips"
                  className="flex-1 inline-flex items-center justify-center gap-2 border-4 border-black bg-[#b8f0a0] hover:bg-[#a0e080] active:bg-[#90d070] text-black font-black uppercase tracking-widest px-6 py-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all duration-100"
                >
                  🗺️ View My Trips
                </Link>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  disabled={isLogoutLoading}
                  className="flex-1 inline-flex items-center justify-center gap-2 border-4 border-black bg-red-400 hover:bg-red-500 active:bg-red-600 disabled:opacity-60 text-black font-black uppercase tracking-widest px-6 py-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all duration-100"
                  aria-label="Log out"
                >
                  {isLogoutLoading ? '⏳ Signing out…' : '🚪 Logout'}
                </button>
              </div>
            </div>
          </div>

          {/* Secondary Info */}
          <div className="mt-8 text-center">
            <p className="text-xs font-bold text-black/50 uppercase tracking-widest">
              Need help? <Link href="/" className="underline hover:no-underline">Go Home</Link>
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
