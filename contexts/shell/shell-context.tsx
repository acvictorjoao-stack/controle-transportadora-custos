'use client';

import * as React from 'react';

import {APP_VERSION} from '@/constants/app/shell';
import type {ShellTenant} from '@/types/global/navigation';

export interface ShellContextValue {
  tenant: ShellTenant | null;
  version: string;
}

const ShellContext = React.createContext<ShellContextValue | undefined>(
  undefined,
);

export interface ShellProviderProps {
  tenant: ShellTenant | null;
  children: React.ReactNode;
}

export function ShellProvider({tenant, children}: ShellProviderProps) {
  const value = React.useMemo<ShellContextValue>(
    () => ({
      tenant,
      version: APP_VERSION,
    }),
    [tenant],
  );

  return (
    <ShellContext.Provider value={value}>{children}</ShellContext.Provider>
  );
}

export {ShellContext};
