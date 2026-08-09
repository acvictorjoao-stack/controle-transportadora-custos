import * as React from 'react';

import {AppShell} from '@/components/layout/app-shell';
import {MainContent} from '@/components/layout/main-content';
import {MasterCompanyBanner} from '@/components/layout/master-company-banner';
import {ScrollableArea} from '@/components/layout/scrollable-area';

export interface DashboardLayoutProps {
  children: React.ReactNode;
  masterCompanyName?: string | null;
}

function DashboardLayout({children, masterCompanyName}: DashboardLayoutProps) {
  return (
    <AppShell>
      {masterCompanyName ? (
        <MasterCompanyBanner companyName={masterCompanyName} />
      ) : null}
      <MainContent>
        <ScrollableArea>{children}</ScrollableArea>
      </MainContent>
    </AppShell>
  );
}

export {DashboardLayout};
