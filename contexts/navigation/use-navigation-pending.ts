'use client';

import {useContext} from 'react';

import {
  NavigationPendingContext,
  type NavigationPendingContextValue,
} from '@/contexts/navigation/navigation-pending-context';

export function useNavigationPending(): NavigationPendingContextValue {
  const context = useContext(NavigationPendingContext);
  if (!context) {
    throw new Error(
      'useNavigationPending must be used within a NavigationPendingProvider',
    );
  }
  return context;
}
