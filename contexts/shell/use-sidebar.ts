'use client';

import {useContext} from 'react';

import {SidebarContext} from '@/contexts/shell/sidebar-context';
import type {SidebarContextValue} from '@/contexts/shell/sidebar-context';

export function useSidebar(): SidebarContextValue {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
