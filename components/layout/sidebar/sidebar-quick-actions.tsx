'use client';

import {Plus} from 'lucide-react';
import Link from 'next/link';

import {ROUTES} from '@/constants/routes/paths';
import {useSidebar} from '@/contexts/shell/use-sidebar';
import {hasPermission, useNavPermissions} from '@/hooks/use-nav-permissions';
import {cn} from '@/lib/utils';

/**
 * Ações rápidas da sidebar — navegam para os fluxos de criação já existentes
 * em Viagens e Contas a Pagar (modais/listagens das respectivas páginas).
 */
function SidebarQuickActions() {
  const {collapsed, setMobileOpen} = useSidebar();
  const permissions = useNavPermissions();

  const canCreateTrip = hasPermission('trips:read', permissions);
  const canCreateExpense = hasPermission('financeiro_pagar:read', permissions);

  if (!canCreateTrip && !canCreateExpense) return null;

  return (
    <div
      data-slot="sidebar-quick-actions"
      className={cn(
        'shrink-0 space-y-2 border-b border-white/10 px-3 py-3',
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
            'inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-[#1D5EFF] text-sm font-medium text-white transition-colors duration-200 hover:bg-[#1A54E6] active:scale-[0.98]',
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
            'inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#1E293B] text-sm font-medium text-slate-100 transition-colors duration-200 hover:bg-[#243247] active:scale-[0.98]',
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
