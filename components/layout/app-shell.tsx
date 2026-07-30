'use client';

import * as React from 'react';
import {usePathname} from 'next/navigation';

import {TopProgress} from '@/components/feedback/top-progress';
import {AppHeader} from '@/components/layout/header/app-header';
import {Sidebar} from '@/components/layout/sidebar/sidebar';
import {SidebarProvider} from '@/contexts/shell/sidebar-context';
import {isHomePortalPath} from '@/lib/navigation/home-portal';
import {cn} from '@/lib/utils';

export interface AppShellProps {
  children: React.ReactNode;
  className?: string;
}

function AppShell({children, className}: AppShellProps) {
  const pathname = usePathname();
  const hideSidebar = isHomePortalPath(pathname);

  return (
    <SidebarProvider>
      <div
        data-slot="app-shell"
        data-home-portal={hideSidebar ? 'true' : undefined}
        className={cn('flex h-screen overflow-hidden bg-background', className)}
      >
        <TopProgress />
        {!hideSidebar && <Sidebar />}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <AppHeader portalMode={hideSidebar} />
          {children}
        </div>
      </div>
    </SidebarProvider>
  );
}

export {AppShell};
