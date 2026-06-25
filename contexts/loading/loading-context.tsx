'use client';

import * as React from 'react';

export interface LoadingContextValue {
  isLoading: boolean;
  progress: number;
  startLoading: () => void;
  stopLoading: () => void;
  setProgress: (value: number) => void;
}

const LoadingContext = React.createContext<LoadingContextValue | undefined>(
  undefined,
);

export function LoadingProvider({children}: {children: React.ReactNode}) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [progress, setProgressState] = React.useState(0);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = React.useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startLoading = React.useCallback(() => {
    clearTimer();
    setIsLoading(true);
    setProgressState(10);
    timerRef.current = setInterval(() => {
      setProgressState((prev) => (prev >= 90 ? prev : prev + Math.random() * 10));
    }, 300);
  }, [clearTimer]);

  const stopLoading = React.useCallback(() => {
    clearTimer();
    setProgressState(100);
    setTimeout(() => {
      setIsLoading(false);
      setProgressState(0);
    }, 200);
  }, [clearTimer]);

  const setProgress = React.useCallback((value: number) => {
    setProgressState(Math.min(100, Math.max(0, value)));
  }, []);

  React.useEffect(() => () => clearTimer(), [clearTimer]);

  const value = React.useMemo(
    () => ({isLoading, progress, startLoading, stopLoading, setProgress}),
    [isLoading, progress, startLoading, stopLoading, setProgress],
  );

  return (
    <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>
  );
}

export {LoadingContext};
