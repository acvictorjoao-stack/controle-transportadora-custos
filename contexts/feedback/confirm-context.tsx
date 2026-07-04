'use client';

import * as React from 'react';

import {Button} from '@/components/ui/button';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = React.createContext<ConfirmContextValue | null>(null);

function ConfirmProvider({children}: {children: React.ReactNode}) {
  const [options, setOptions] = React.useState<ConfirmOptions | null>(null);
  const resolveRef = React.useRef<((value: boolean) => void) | null>(null);

  const confirm = React.useCallback((nextOptions: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setOptions(nextOptions);
    });
  }, []);

  const close = React.useCallback((result: boolean) => {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setOptions(null);
  }, []);

  React.useEffect(() => {
    if (!options) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        close(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [options, close]);

  const value = React.useMemo(() => ({confirm}), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {options && (
        <div
          className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-description"
        >
          <div
            className="absolute inset-0 bg-black/50"
            aria-hidden="true"
            onClick={() => close(false)}
          />
          <Card className="relative z-10 w-full max-w-md shadow-lg">
            <CardHeader>
              <CardTitle id="confirm-dialog-title">{options.title}</CardTitle>
              <CardDescription id="confirm-dialog-description">
                {options.description}
              </CardDescription>
            </CardHeader>
            <CardFooter className="justify-end gap-2 border-t border-border pt-4">
              <Button type="button" variant="outline" onClick={() => close(false)}>
                {options.cancelLabel ?? 'Cancelar'}
              </Button>
              <Button
                type="button"
                variant={options.variant === 'destructive' ? 'destructive' : 'default'}
                autoFocus
                onClick={() => close(true)}
              >
                {options.confirmLabel ?? 'Confirmar'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

function useConfirm() {
  const context = React.useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within ConfirmProvider');
  }
  return context.confirm;
}

export {ConfirmProvider, useConfirm};
