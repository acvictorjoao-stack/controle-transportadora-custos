'use client';

import * as React from 'react';

import type {Permission} from '@/types/global/navigation';

interface NavPermissionsContextValue {
  permissions: Permission[];
}

const NavPermissionsContext = React.createContext<
  NavPermissionsContextValue | undefined
>(undefined);

export interface NavPermissionsProviderProps {
  permissions: Permission[];
  children: React.ReactNode;
}

export function NavPermissionsProvider({
  permissions,
  children,
}: NavPermissionsProviderProps) {
  const value = React.useMemo(
    () => ({permissions}),
    [permissions],
  );

  return (
    <NavPermissionsContext.Provider value={value}>
      {children}
    </NavPermissionsContext.Provider>
  );
}

export function useNavPermissionsContext(): NavPermissionsContextValue {
  const context = React.useContext(NavPermissionsContext);
  if (!context) {
    return {permissions: []};
  }
  return context;
}
