import * as React from 'react';

import {AppShell} from '@/components/layout/app-shell';
import {MainContent} from '@/components/layout/main-content';
import {ScrollableArea} from '@/components/layout/scrollable-area';

export interface DashboardLayoutProps {
  children: React.ReactNode;
}

function DashboardLayout({children}: DashboardLayoutProps) {
  return (
    <AppShell>
      <MainContent>
        <ScrollableArea>{children}</ScrollableArea>
      </MainContent>
    </AppShell>
  );
}

export {DashboardLayout};
