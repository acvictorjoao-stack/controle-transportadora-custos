'use client';

import * as React from 'react';

import {SIDEBAR_STORAGE_KEY} from '@/constants/app/sidebar';

export interface SidebarContextValue {
  collapsed: boolean;
  mobileOpen: boolean;
  toggleCollapsed: () => void;
  setCollapsed: (collapsed: boolean) => void;
  setMobileOpen: (open: boolean) => void;
  toggleMobile: () => void;
}

const SidebarContext = React.createContext<SidebarContextValue | undefined>(
  undefined,
);

function readSidebarCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
  if (stored !== null) return stored === 'true';
  return false;
}

export function SidebarProvider({children}: {children: React.ReactNode}) {
  const [collapsed, setCollapsedState] = React.useState(readSidebarCollapsed);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  const setCollapsed = React.useCallback((value: boolean) => {
    setCollapsedState(value);
  }, []);

  const toggleCollapsed = React.useCallback(() => {
    setCollapsedState((prev) => !prev);
  }, []);

  const toggleMobile = React.useCallback(() => {
    setMobileOpen((prev) => !prev);
  }, []);

  const value = React.useMemo(
    () => ({
      collapsed,
      mobileOpen,
      toggleCollapsed,
      setCollapsed,
      setMobileOpen,
      toggleMobile,
    }),
    [collapsed, mobileOpen, toggleCollapsed, setCollapsed, toggleMobile],
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

export {SidebarContext};
