'use client';

import {LogOut, Settings, User} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import {Button} from '@/components/ui/button';
import {ROUTES} from '@/constants/routes/paths';
import {useAuth} from '@/contexts/auth/use-auth';
import {cn} from '@/lib/utils';

function HeaderUserMenu() {
  const {user, isLoading, signOut} = useAuth();
  const [open, setOpen] = React.useState(false);
  const [isSigningOut, setIsSigningOut] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoading || !user) {
    return (
      <div
        className="size-9 animate-pulse rounded-full bg-muted"
        aria-hidden="true"
      />
    );
  }

  const displayName = user.name?.trim() || 'Usuário';
  const displayEmail = user.email?.trim() || '—';

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || displayEmail.charAt(0).toUpperCase() || 'U';

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
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-primary text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
        aria-label="Menu do usuário"
        aria-expanded={open}
      >
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt={displayName}
            className="size-full object-cover"
          />
        ) : (
          initials
        )}
      </button>

      {open && (
        <div
          className={cn(
            'absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-border bg-popover p-1 shadow-lg animate-slide-up',
          )}
        >
          <div className="border-b border-border px-3 py-2.5">
            <p className="text-sm font-medium">{displayName}</p>
            <p className="text-xs text-muted-foreground">{displayEmail}</p>
          </div>
          <div className="py-1">
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              disabled
            >
              <User className="size-4" />
              Meu Perfil
            </button>
            <Link
              href={ROUTES.configuracoes}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              onClick={() => setOpen(false)}
            >
              <Settings className="size-4" />
              Configurações
            </Link>
            <Button
              type="button"
              variant="ghost"
              className="h-auto w-full justify-start gap-2 rounded-md px-3 py-2 text-sm font-normal text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={handleSignOut}
              loading={isSigningOut}
            >
              <LogOut className="size-4" />
              Sair
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export {HeaderUserMenu};
