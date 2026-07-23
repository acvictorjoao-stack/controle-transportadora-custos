import {useNavPermissionsContext} from '@/contexts/auth/nav-permissions-context';
import type {Permission} from '@/types/global/navigation';

/**
 * Permissões de navegação agrupadas por alias para módulos ainda sem código dedicado.
 */
const PERMISSION_ALIASES: Record<string, string[]> = {
  'dashboard:read': [
    'companies:read',
    'branches:read',
    'vehicles:read',
    'drivers:read',
    'routes:read',
    'trips:read',
    'fuel:read',
    'maintenance:read',
    'tires:read',
  ],
  'cadastros:read': [
    'companies:read',
    'branches:read',
    'members:read',
    'roles:read',
    'profiles:read',
    'customers:read',
  ],
  'operacoes:read': [
    'vehicles:read',
    'drivers:read',
    'routes:read',
    'trips:read',
    'fuel:read',
    'maintenance:read',
    'tires:read',
  ],
  'analise:read': [
    'dashboard:read',
    'bi:read',
    'relatorios:read',
    'companies:read',
    'vehicles:read',
    'drivers:read',
    'routes:read',
    'trips:read',
  ],
};

export function useNavPermissions(): Permission[] {
  const {permissions} = useNavPermissionsContext();
  return permissions;
}

export function hasPermission(
  required: Permission | undefined,
  userPermissions: Permission[],
): boolean {
  if (!required) return true;
  if (userPermissions.includes('*')) return true;
  if (userPermissions.includes(required)) return true;

  const aliases = PERMISSION_ALIASES[required];
  if (aliases) {
    return aliases.some((alias) => userPermissions.includes(alias));
  }

  return false;
}
