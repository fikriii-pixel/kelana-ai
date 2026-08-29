'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getToken, clearToken, fetchWithAuth } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  total_trips: number;
}

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  fetchUserProfile: () => Promise<void>;
  logout: () => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user profile from /api/v1/auth/me
  const fetchUserProfile = async () => {
    try {
      const token = getToken();
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const res = await fetchWithAuth('/auth/me');
      if (!res.ok) {
        throw new Error(`Failed to fetch profile: ${res.status}`);
      }

      const data: UserProfile = await res.json();
      setUser(data);
    } catch (err) {
      console.error('[AuthContext] Failed to fetch user profile:', err);
      setUser(null);
      clearToken();
    } finally {
      setIsLoading(false);
    }
  };

  // On mount, try to restore user from token
  useEffect(() => {
    fetchUserProfile();
  }, []);

  const logout = () => {
    setUser(null);
    clearToken();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        fetchUserProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
