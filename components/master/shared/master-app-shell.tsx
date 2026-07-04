'use client';

import * as React from 'react';

import {TopProgress} from '@/components/feedback/top-progress';
import {AppHeader} from '@/components/layout/header/app-header';
import {SidebarProvider} from '@/contexts/shell/sidebar-context';
import {cn} from '@/lib/utils';

import {MasterSidebar} from './master-sidebar';

export interface MasterAppShellProps {
  children: React.ReactNode;
  className?: string;
}

function MasterAppShell({children, className}: MasterAppShellProps) {
  return (
    <SidebarProvider>
      <div
        data-slot="master-app-shell"
        className={cn('flex h-screen overflow-hidden bg-background', className)}
      >
        <TopProgress />
        <MasterSidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <AppHeader />
          {children}
        </div>
      </div>
    </SidebarProvider>
  );
}

export {MasterAppShell};
