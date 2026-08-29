'use client';

/**
 * lib/toast-context.tsx
 * Global toast notification system.
 * Wrap the app with <ToastProvider>, then call useToast() from any client component.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

// ── Style maps ────────────────────────────────────────────────────────────────

const TYPE_STYLES: Record<ToastType, { bg: string; icon: string }> = {
  success: { bg: 'bg-[#b8f0a0]', icon: '✓' },
  error:   { bg: 'bg-[#ff6b6b]', icon: '⚠' },
  info:    { bg: 'bg-[#f9e07a]', icon: '✦' },
};

// ── Single Toast Item ─────────────────────────────────────────────────────────

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: number) => void;
}) {
  const styles = TYPE_STYLES[toast.type];

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`
        flex items-start gap-3
        ${styles.bg}
        border-4 border-black
        shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]
        px-4 py-3
        min-w-[280px] max-w-[380px]
        toast-slide-in
      `}
      style={{ fontFamily: "'Space Grotesk','Inter',system-ui,sans-serif" }}
    >
      {/* Icon */}
      <span className="text-lg leading-none mt-0.5 shrink-0 text-black">
        {styles.icon}
      </span>

      {/* Message */}
      <span className="flex-1 text-sm font-bold text-black leading-snug">
        {toast.message}
      </span>

      {/* Dismiss */}
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 text-black/40 hover:text-black transition-colors text-lg font-black leading-none"
        aria-label="Dismiss notification"
      >
        ✕
      </button>
    </div>
  );
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++counterRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    // Auto-dismiss after 3.5 s
    setTimeout(() => dismiss(id), 3500);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Fixed top-right container */}
      <div
        className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 items-end pointer-events-none"
        aria-label="Notifications"
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
