'use client';

import * as React from 'react';

import {TopProgress} from '@/components/feedback/top-progress';
import {AppHeader} from '@/components/layout/header/app-header';
import {Sidebar} from '@/components/layout/sidebar/sidebar';
import {SidebarProvider} from '@/contexts/shell/sidebar-context';
import {cn} from '@/lib/utils';

export interface AppShellProps {
  children: React.ReactNode;
  className?: string;
}

function AppShell({children, className}: AppShellProps) {
  return (
    <SidebarProvider>
      <div
        data-slot="app-shell"
        className={cn('flex h-screen overflow-hidden bg-background', className)}
      >
        <TopProgress />
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <AppHeader />
          {children}
        </div>
      </div>
    </SidebarProvider>
  );
}

export {AppShell};
