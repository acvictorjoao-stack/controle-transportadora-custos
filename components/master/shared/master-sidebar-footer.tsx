'use client';

import {Shield} from 'lucide-react';

import {Badge} from '@/components/ui/badge';
import {PORTAL_ROLE_LABELS, getPortalRoleFromUser} from '@/lib/auth/permissions';
import {useAuth} from '@/contexts/auth/use-auth';
import {useSidebar} from '@/contexts/shell/use-sidebar';
import {usePortalUser} from '@/hooks/use-portal-user';

function MasterSidebarFooter() {
  const {collapsed} = useSidebar();
  const {user} = useAuth();
  const {portalUser} = usePortalUser();
  const role = getPortalRoleFromUser(portalUser);

  if (collapsed) {
    return (
      <div className="shrink-0 border-t border-sidebar-border p-3">
        <div
          className="mx-auto flex size-8 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground"
          title="Portal Master"
        >
          <Shield className="size-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-t border-sidebar-border p-3">
      <div className="rounded-lg bg-sidebar-accent p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-sidebar-accent-foreground">
              FleetControl SaaS
            </p>
            <Badge variant="info" className="mt-1 text-[10px]">
              Portal Master
            </Badge>
          </div>
        </div>
        <div className="mt-3 border-t border-sidebar-border pt-3">
          <p className="truncate text-xs font-medium">
            {role ? PORTAL_ROLE_LABELS[role] : '—'}
          </p>
          <p className="truncate text-[10px] text-muted-foreground">
            {user?.email ?? '—'}
          </p>
        </div>
      </div>
    </div>
  );
}

export {MasterSidebarFooter};
