'use client';

import {Building2} from 'lucide-react';

import {Badge} from '@/components/ui/badge';
import {SHELL_PLACEHOLDER} from '@/constants/app/shell';
import {useSidebar} from '@/contexts/shell/use-sidebar';
import {cn} from '@/lib/utils';

function SidebarFooter() {
  const {collapsed} = useSidebar();
  const {tenant, user, version} = SHELL_PLACEHOLDER;

  if (collapsed) {
    return (
      <div className="shrink-0 border-t border-sidebar-border p-3">
        <div
          className="mx-auto flex size-8 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground"
          title={`${tenant.name} — ${tenant.plan}`}
        >
          <Building2 className="size-4" />
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
              {tenant.name}
            </p>
            <Badge variant="secondary" className="mt-1 text-[10px]">
              {tenant.plan}
            </Badge>
          </div>
        </div>
        <div className="mt-3 border-t border-sidebar-border pt-3">
          <p className="truncate text-xs font-medium">{user.name}</p>
          <p className="truncate text-[10px] text-muted-foreground">
            {user.email}
          </p>
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">v{version}</p>
      </div>
    </div>
  );
}

export {SidebarFooter};
