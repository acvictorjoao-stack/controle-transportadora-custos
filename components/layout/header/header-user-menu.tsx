'use client';

import {LogOut, Settings, User} from 'lucide-react';
import * as React from 'react';

import {Button} from '@/components/ui/button';
import {SHELL_PLACEHOLDER} from '@/constants/app/shell';
import {cn} from '@/lib/utils';

function HeaderUserMenu() {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const {user} = SHELL_PLACEHOLDER;

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex size-9 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
        aria-label="Menu do usuário"
        aria-expanded={open}
      >
        {initials}
      </button>

      {open && (
        <div
          className={cn(
            'absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-border bg-popover p-1 shadow-lg animate-slide-up',
          )}
        >
          <div className="border-b border-border px-3 py-2.5">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <div className="py-1">
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              disabled
            >
              <User className="size-4" />
              Meu perfil
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              disabled
            >
              <Settings className="size-4" />
              Configurações
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
              disabled
            >
              <LogOut className="size-4" />
              Sair
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export {HeaderUserMenu};
