import type {Permission} from '@/types/global/navigation';

/**
 * Hook placeholder para permissões de navegação.
 * Retorna todas as permissões até RBAC ser implementado.
 */
export function useNavPermissions(): Permission[] {
  return ['*'];
}

export function hasPermission(
  required: Permission | undefined,
  userPermissions: Permission[],
): boolean {
  if (!required) return true;
  if (userPermissions.includes('*')) return true;
  return userPermissions.includes(required);
}
