'use client';

import {useContext} from 'react';

import {ShellContext, type ShellContextValue} from '@/contexts/shell/shell-context';

export function useShell(): ShellContextValue {
  const context = useContext(ShellContext);

  if (!context) {
    return {
      tenant: null,
      version: '0.0.0',
    };
  }

  return context;
}
