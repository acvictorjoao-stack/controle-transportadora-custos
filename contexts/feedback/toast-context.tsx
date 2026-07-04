'use client';

import {CheckCircle2, X, XCircle} from 'lucide-react';
import * as React from 'react';

import {Button} from '@/components/ui/button';
import {cn} from '@/lib/utils';

type ToastVariant = 'success' | 'error';

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 4000;

function ToastProvider({children}: {children: React.ReactNode}) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = React.useCallback((message: string, variant: ToastVariant) => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, {id, message, variant}]);

    window.setTimeout(() => {
      dismiss(id);
    }, AUTO_DISMISS_MS);
  }, [dismiss]);

  const value = React.useMemo(
    () => ({
      success: (message: string) => push(message, 'success'),
      error: (message: string) => push(message, 'error'),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed bottom-4 right-4 z-[var(--z-toast)] flex w-full max-w-sm flex-col gap-2"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg',
              toast.variant === 'success'
                ? 'border-success/30 bg-background text-foreground'
                : 'border-destructive/30 bg-background text-foreground',
            )}
          >
            {toast.variant === 'success' ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
            ) : (
              <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
            )}
            <p className="flex-1 text-sm">{toast.message}</p>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0"
              aria-label="Fechar notificação"
              onClick={() => dismiss(toast.id)}
            >
              <X className="size-4" />
            </Button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

export {ToastProvider, useToast};
