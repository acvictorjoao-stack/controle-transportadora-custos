import * as React from 'react';

import {MasterAppShell} from '@/components/master/shared/master-app-shell';
import {MasterProtectedRoute} from '@/components/master/shared/master-protected-route';
import {MainContent} from '@/components/layout/main-content';
import {ScrollableArea} from '@/components/layout/scrollable-area';

export interface MasterLayoutProps {
  children: React.ReactNode;
}

function MasterLayout({children}: MasterLayoutProps) {
  return (
    <MasterProtectedRoute>
      <MasterAppShell>
        <MainContent>
          <ScrollableArea>{children}</ScrollableArea>
        </MainContent>
      </MasterAppShell>
    </MasterProtectedRoute>
  );
}

export {MasterLayout};
