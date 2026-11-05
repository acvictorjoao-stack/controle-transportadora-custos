import {hasPermission} from '@/lib/navigation/has-permission';
import type {Permission} from '@/types/global/navigation';

/**
 * Uma ação rápida só aparece para quem abre a página de destino e também pode
 * criar o registro — as mesmas permissões exigidas pela página e pela server action.
 */
export function getQuickActionAccess(permissions: Permission[]): {
  canCreateTrip: boolean;
  canCreateExpense: boolean;
} {
  const can = (permission: Permission) => hasPermission(permission, permissions);

  return {
    canCreateTrip: can('trips:read') && can('trips:create'),
    canCreateExpense:
      (can('financeiro_pagar:read') || can('financeiro:read')) &&
      can('financeiro:create'),
  };
}
