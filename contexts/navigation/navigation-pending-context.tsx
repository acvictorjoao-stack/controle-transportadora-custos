'use client';

import {usePathname} from 'next/navigation';
import * as React from 'react';

import {useLoading} from '@/contexts/loading/use-loading';
import {splitNavHref} from '@/lib/navigation/breadcrumb';

export interface NavigationPendingContextValue {
  pendingHref: string | null;
  isPending: (href: string) => boolean;
  startNavigation: (href: string) => void;
  clearPending: () => void;
}

const NavigationPendingContext =
  React.createContext<NavigationPendingContextValue | undefined>(undefined);

const PENDING_TIMEOUT_MS = 8_000;

export function NavigationPendingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const {startLoading, stopLoading} = useLoading();
  const [pendingHref, setPendingHref] = React.useState<string | null>(null);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingHrefRef = React.useRef<string | null>(null);

  const clearTimer = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const clearPending = React.useCallback(() => {
    clearTimer();
    pendingHrefRef.current = null;
    setPendingHref(null);
    stopLoading();
  }, [clearTimer, stopLoading]);

  const startNavigation = React.useCallback(
    (href: string) => {
      const {path} = splitNavHref(href);
      if (!path || path === pathname) return;

      if (process.env.NODE_ENV === 'development') {
        void import('@/lib/performance/nav-timing').then(({markNavClick}) => {
          markNavClick(path);
        });
      }

      clearTimer();
      pendingHrefRef.current = path;
      setPendingHref(path);
      startLoading();
      timeoutRef.current = setTimeout(() => {
        pendingHrefRef.current = null;
        setPendingHref(null);
        stopLoading();
        timeoutRef.current = null;
      }, PENDING_TIMEOUT_MS);
    },
    [clearTimer, pathname, startLoading, stopLoading],
  );

  // Clear pending when the pathname catches up (event-like, in effect).
  React.useEffect(() => {
    const pending = pendingHrefRef.current;
    if (!pending) return;
    const {path: pendingPath} = splitNavHref(pending);
    if (pathname === pendingPath || pathname.startsWith(`${pendingPath}/`)) {
      if (process.env.NODE_ENV === 'development') {
        void import('@/lib/performance/nav-timing').then(({markNavReady}) => {
          markNavReady(pendingPath);
        });
      }
      clearPending();
    }
  }, [pathname, clearPending]);

  React.useEffect(() => () => clearTimer(), [clearTimer]);

  const isPending = React.useCallback(
    (href: string) => {
      if (!pendingHref) return false;
      const {path} = splitNavHref(href);
      return path === pendingHref || pendingHref.startsWith(`${path}/`);
    },
    [pendingHref],
  );

  const value = React.useMemo(
    () => ({pendingHref, isPending, startNavigation, clearPending}),
    [pendingHref, isPending, startNavigation, clearPending],
  );

  return (
    <NavigationPendingContext.Provider value={value}>
      {children}
    </NavigationPendingContext.Provider>
  );
}

export {NavigationPendingContext};
