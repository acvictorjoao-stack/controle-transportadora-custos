import * as React from 'react';

import {DashboardLayout} from '@/components/layout/dashboard-layout';
import {Badge} from '@/components/ui/badge';

export interface TenantLayoutProps {
  children: React.ReactNode;
  tenantName?: string;
}

/**
 * Layout multi-tenant — envolve DashboardLayout com contexto de tenant.
 * O slug do tenant é resolvido pela rota [tenant].
 */
function TenantLayout({
  children,
  tenantName = 'Empresa',
}: TenantLayoutProps) {
  return (
    <DashboardLayout>
      <div data-slot="tenant-layout" data-tenant={tenantName}>
        <div className="hidden" aria-hidden="true">
          <Badge variant="outline">{tenantName}</Badge>
        </div>
        {children}
      </div>
    </DashboardLayout>
  );
}

export {TenantLayout};
