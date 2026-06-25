'use client';

import {useContext} from 'react';

import {ThemeContext} from '@/contexts/theme/theme-context';
import type {ThemeContextValue} from '@/types/global/theme';

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
