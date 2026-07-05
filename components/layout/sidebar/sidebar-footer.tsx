'use client';

import {Building2} from 'lucide-react';

import {Badge} from '@/components/ui/badge';
import {SHELL_FALLBACKS} from '@/constants/app/shell';
import {useAuth} from '@/contexts/auth/use-auth';
import {useShell} from '@/contexts/shell/use-shell';
import {useSidebar} from '@/contexts/shell/use-sidebar';
import {cn} from '@/lib/utils';

function TenantAvatar({
  name,
  logoUrl,
  className,
}: {
  name: string;
  logoUrl: string | null;
  className?: string;
}) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={name}
        className={cn('rounded-lg object-cover', className)}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground',
        className,
      )}
    >
      <Building2 className="size-4" />
    </div>
  );
}

function SidebarFooter() {
  const {collapsed} = useSidebar();
  const {tenant, version} = useShell();
  const {user} = useAuth();

  const companyName = tenant?.name ?? SHELL_FALLBACKS.companyName;
  const planName = tenant?.plan ?? SHELL_FALLBACKS.planName;
  const userName = user?.name?.trim() || SHELL_FALLBACKS.userName;
  const userEmail = user?.email?.trim() || '—';
  const logoUrl = tenant?.logoUrl ?? null;

  if (collapsed) {
    return (
      <div className="shrink-0 border-t border-sidebar-border p-3">
        <div
          className="mx-auto w-fit"
          title={`${companyName} — ${planName}`}
        >
          <TenantAvatar
            name={companyName}
            logoUrl={logoUrl}
            className="size-8"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-t border-sidebar-border p-3">
      <div className="rounded-lg bg-sidebar-accent p-3">
        <div className="flex items-start gap-2">
          <TenantAvatar
            name={companyName}
            logoUrl={logoUrl}
            className="size-8 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-sidebar-accent-foreground">
              {companyName}
            </p>
            <Badge variant="secondary" className="mt-1 text-[10px]">
              {planName}
            </Badge>
          </div>
        </div>
        <div className="mt-3 border-t border-sidebar-border pt-3">
          <p className="truncate text-xs font-medium">{userName}</p>
          <p className="truncate text-[10px] text-muted-foreground">
            {userEmail}
          </p>
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">v{version}</p>
      </div>
    </div>
  );
}

export {SidebarFooter};
