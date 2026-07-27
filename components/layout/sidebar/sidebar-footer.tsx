'use client';

import {
  Building2,
  ChevronsUpDown,
  LogOut,
  RefreshCw,
  Settings,
  User,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {resolveAppEnvironmentLabel} from '@/constants/app/environment';
import {SHELL_FALLBACKS} from '@/constants/app/shell';
import {ROUTES} from '@/constants/routes/paths';
import {useAuth} from '@/contexts/auth/use-auth';
import {useShell} from '@/contexts/shell/use-shell';
import {useSidebar} from '@/contexts/shell/use-sidebar';
import {cn} from '@/lib/utils';

import {SidebarBadge} from './sidebar-badge';

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
        className={cn('rounded-md object-cover', className)}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-md bg-sidebar-accent text-sidebar-accent-foreground',
        className,
      )}
    >
      <Building2 className="size-3.5" aria-hidden="true" />
    </div>
  );
}

function WorkspaceMenu({
  companyName,
  planName,
  environment,
  userName,
  onClose,
  onSignOut,
  isSigningOut,
  align = 'left',
}: {
  companyName: string;
  planName: string;
  environment: string;
  userName: string;
  onClose: () => void;
  onSignOut: () => void;
  isSigningOut: boolean;
  align?: 'left' | 'center';
}) {
  return (
    <div
      role="menu"
      aria-label="Workspace"
      className={cn(
        'absolute bottom-full z-50 mb-1 rounded-lg border border-border bg-popover p-1 shadow-lg animate-slide-up',
        align === 'left' ? 'left-2 right-2' : 'left-1/2 w-56 -translate-x-1/2',
      )}
    >
      <div className="border-b border-border px-2.5 py-2">
        <p className="truncate text-sm font-semibold">{companyName}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
            {planName}
          </Badge>
          <Badge
            variant="outline"
            className="h-4 px-1.5 text-[10px] font-medium"
          >
            {environment}
          </Badge>
        </div>
        <p className="mt-1.5 truncate text-xs text-muted-foreground">{userName}</p>
      </div>
      <div className="py-1">
        <button
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-muted-foreground"
          disabled
        >
          <User className="size-4" aria-hidden="true" />
          <span className="flex-1 text-left">Meu Perfil</span>
          <SidebarBadge value="Em breve" />
        </button>
        <Link
          href={ROUTES.configuracoes}
          role="menuitem"
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          onClick={onClose}
        >
          <Settings className="size-4" aria-hidden="true" />
          Configurações
        </Link>
        <button
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-muted-foreground"
          disabled
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          <span className="flex-1 text-left">Trocar Empresa</span>
          <SidebarBadge value="Em breve" />
        </button>
        <Button
          type="button"
          role="menuitem"
          variant="ghost"
          className="h-auto w-full justify-start gap-2 rounded-md px-2.5 py-2 text-sm font-normal text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={onSignOut}
          loading={isSigningOut}
        >
          <LogOut className="size-4" aria-hidden="true" />
          Sair
        </Button>
      </div>
    </div>
  );
}

/**
 * Seletor de Workspace no rodapé da sidebar (RC 28.0.3).
 * Exibe empresa atual, plano e ambiente.
 */
function SidebarFooter() {
  const {collapsed} = useSidebar();
  const {tenant} = useShell();
  const {user, signOut} = useAuth();
  const [open, setOpen] = React.useState(false);
  const [isSigningOut, setIsSigningOut] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  const companyName = tenant?.name ?? SHELL_FALLBACKS.companyName;
  const planName = tenant?.plan ?? SHELL_FALLBACKS.planName;
  const userName = user?.name?.trim() || SHELL_FALLBACKS.userName;
  const logoUrl = tenant?.logoUrl ?? null;
  const environment = resolveAppEnvironmentLabel();

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
      setOpen(false);
    }
  }

  return (
    <div
      ref={ref}
      data-slot="sidebar-workspace"
      className="relative shrink-0 border-t border-sidebar-border p-2"
    >
      {collapsed ? (
        <button
          type="button"
          title={`${companyName} · ${planName} · ${environment}`}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label="Seletor de Workspace"
          onClick={() => setOpen((prev) => !prev)}
          className="mx-auto flex w-fit rounded-md p-0.5 transition-opacity hover:opacity-90"
        >
          <TenantAvatar
            name={companyName}
            logoUrl={logoUrl}
            className="size-8"
          />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label="Seletor de Workspace"
          className={cn(
            'flex w-full items-center gap-2.5 rounded-lg border border-sidebar-border/70 bg-sidebar-accent/70 px-2.5 py-2 text-left transition-colors',
            'hover:bg-sidebar-accent',
            open && 'ring-1 ring-sidebar-border',
          )}
        >
          <TenantAvatar
            name={companyName}
            logoUrl={logoUrl}
            className="size-8 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-sidebar-accent-foreground">
              {companyName}
            </p>
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1">
              <Badge
                variant="secondary"
                className="h-4 max-w-[7rem] truncate px-1.5 text-[9px] font-medium"
              >
                {planName}
              </Badge>
              <Badge
                variant="outline"
                className="h-4 px-1.5 text-[9px] font-medium text-muted-foreground"
              >
                {environment}
              </Badge>
            </div>
          </div>
          <ChevronsUpDown
            className="size-3.5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        </button>
      )}

      {open && (
        <WorkspaceMenu
          companyName={companyName}
          planName={planName}
          environment={environment}
          userName={userName}
          onClose={() => setOpen(false)}
          onSignOut={handleSignOut}
          isSigningOut={isSigningOut}
          align={collapsed ? 'center' : 'left'}
        />
      )}
    </div>
  );
}

export {SidebarFooter};
