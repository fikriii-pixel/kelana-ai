'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/api';
import { useToast } from '@/lib/toast-context';

/**
 * Hook to protect client components with JWT authentication.
 * Redirects to /login if no token is found.
 * 
 * Usage:
 *   const router = useRouter();
 *   useAuthGuard(router);
 */
export function useAuthGuard(
  router: ReturnType<typeof useRouter>,
  options?: {
    redirectTo?: string;
    showToast?: boolean;
    toastMessage?: string;
  }
) {
  const { showToast } = useToast();
  const {
    redirectTo = '/login',
    showToast: shouldShowToast = false,
    toastMessage = 'Please log in to continue.',
  } = options || {};

  useEffect(() => {
    const token = getToken();
    if (!token) {
      if (shouldShowToast) {
        showToast(toastMessage, 'warning');
      }
      router.replace(redirectTo);
    }
  }, [router, redirectTo, shouldShowToast, toastMessage, showToast]);
}
