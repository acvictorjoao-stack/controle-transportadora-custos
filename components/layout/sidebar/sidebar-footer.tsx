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
import {SHELL_FALLBACKS} from '@/constants/app/shell';
import {ROUTES} from '@/constants/routes/paths';
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
      <Building2 className="size-3.5" />
    </div>
  );
}

function ContextMenu({
  companyName,
  userName,
  onClose,
  onSignOut,
  isSigningOut,
  align = 'left',
}: {
  companyName: string;
  userName: string;
  onClose: () => void;
  onSignOut: () => void;
  isSigningOut: boolean;
  align?: 'left' | 'center';
}) {
  return (
    <div
      className={cn(
        'absolute bottom-full z-50 mb-1 rounded-lg border border-border bg-popover p-1 shadow-lg animate-slide-up',
        align === 'left' ? 'left-2 right-2' : 'left-1/2 w-56 -translate-x-1/2',
      )}
    >
      <div className="border-b border-border px-2.5 py-2">
        <p className="truncate text-sm font-medium">{companyName}</p>
        <p className="truncate text-xs text-muted-foreground">{userName}</p>
      </div>
      <div className="py-1">
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-muted-foreground"
          disabled
        >
          <User className="size-4" />
          <span className="flex-1 text-left">Meu Perfil</span>
          <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
            Em breve
          </Badge>
        </button>
        <Link
          href={ROUTES.configuracoes}
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          onClick={onClose}
        >
          <Settings className="size-4" />
          Configurações
        </Link>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-muted-foreground"
          disabled
        >
          <RefreshCw className="size-4" />
          <span className="flex-1 text-left">Trocar Empresa</span>
          <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
            Em breve
          </Badge>
        </button>
        <Button
          type="button"
          variant="ghost"
          className="h-auto w-full justify-start gap-2 rounded-md px-2.5 py-2 text-sm font-normal text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={onSignOut}
          loading={isSigningOut}
        >
          <LogOut className="size-4" />
          Sair
        </Button>
      </div>
    </div>
  );
}

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

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
      className={cn(
        'relative shrink-0 border-t border-sidebar-border',
        collapsed ? 'p-2' : 'p-2',
      )}
    >
      {collapsed ? (
        <button
          type="button"
          title={`${companyName} — ${planName}`}
          aria-expanded={open}
          aria-label="Menu da empresa"
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
          aria-label="Menu da empresa"
          className={cn(
            'flex w-full items-center gap-2 rounded-lg bg-sidebar-accent px-2 py-2 text-left transition-colors',
            'hover:bg-sidebar-accent/80',
            open && 'ring-1 ring-sidebar-border',
          )}
        >
          <TenantAvatar
            name={companyName}
            logoUrl={logoUrl}
            className="size-7 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-sidebar-accent-foreground">
              {companyName}
            </p>
            <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
              <Badge variant="secondary" className="h-4 px-1 text-[9px]">
                {planName}
              </Badge>
              <span className="truncate text-[10px] text-muted-foreground">
                {userName}
              </span>
            </div>
          </div>
          <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
      )}

      {open && (
        <ContextMenu
          companyName={companyName}
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
