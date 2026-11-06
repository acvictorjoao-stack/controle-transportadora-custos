'use client';

import {Plus} from 'lucide-react';
import Link from 'next/link';

import {ROUTES} from '@/constants/routes/paths';
import {useSidebar} from '@/contexts/shell/use-sidebar';
import {useNavPermissions} from '@/hooks/use-nav-permissions';
import {getQuickActionAccess} from '@/lib/navigation/quick-actions';
import {cn} from '@/lib/utils';

/**
 * Ações rápidas da sidebar — navegam para os fluxos de criação já existentes
 * em Viagens e Contas a Pagar (modais/listagens das respectivas páginas).
 */
function SidebarQuickActions() {
  const {collapsed, setMobileOpen} = useSidebar();
  const permissions = useNavPermissions();

  const {canCreateTrip, canCreateExpense} = getQuickActionAccess(permissions);

  if (!canCreateTrip && !canCreateExpense) return null;

  return (
    <div
      data-slot="sidebar-quick-actions"
      className={cn(
        'shrink-0 space-y-2 border-b border-sidebar-border px-3 py-3',
        collapsed && 'px-2',
      )}
    >
      {canCreateTrip && (
        <Link
          href={ROUTES.viagens}
          prefetch
          title={collapsed ? 'Nova Viagem' : undefined}
          aria-label="Nova Viagem"
          onClick={() => setMobileOpen(false)}
          className={cn(
            'inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-sidebar-primary text-sm font-medium text-sidebar-accent-foreground transition-colors duration-200 hover:bg-sidebar-primary-hover active:scale-[0.98]',
            collapsed && 'px-0',
          )}
        >
          <Plus className="size-4 shrink-0" aria-hidden="true" />
          {!collapsed && <span>Nova Viagem</span>}
        </Link>
      )}
      {canCreateExpense && (
        <Link
          href={ROUTES.contasAPagar}
          prefetch
          title={collapsed ? 'Nova Despesa' : undefined}
          aria-label="Nova Despesa"
          onClick={() => setMobileOpen(false)}
          className={cn(
            'inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent text-sm font-medium text-sidebar-accent-foreground transition-colors duration-200 hover:bg-sidebar-accent-hover active:scale-[0.98]',
            collapsed && 'px-0',
          )}
        >
          <Plus className="size-4 shrink-0" aria-hidden="true" />
          {!collapsed && <span>Nova Despesa</span>}
        </Link>
      )}
    </div>
  );
}

export {SidebarQuickActions};
