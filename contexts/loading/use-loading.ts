'use client';

import {useContext} from 'react';

import {LoadingContext} from '@/contexts/loading/loading-context';
import type {LoadingContextValue} from '@/contexts/loading/loading-context';

export function useLoading(): LoadingContextValue {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}
