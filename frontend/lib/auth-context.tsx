'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { clearToken, fetchWithAuth, getToken } from '@/lib/api';

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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserProfile = async (): Promise<void> => {
    try {
      const token = getToken();

      if (!token) {
        setUser(null);
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

  useEffect(() => {
    queueMicrotask(() => {
      void fetchUserProfile();
    });
  }, []);

  const logout = (): void => {
    setUser(null);
    clearToken();
    document.cookie = 'auth-token=; path=/; max-age=0';
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

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}