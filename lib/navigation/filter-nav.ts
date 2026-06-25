import type {NavGroup, Permission} from '@/types/global/navigation';

/**
 * Filtra navegação por permissões do usuário.
 * Placeholder: retorna tudo até RBAC ser implementado.
 */
export function filterNavByPermissions(
  groups: NavGroup[],
  _permissions: Permission[] = [],
): NavGroup[] {
  return groups.map((group) => ({
    ...group,
    items: group.items.map((item) => ({
      ...item,
      children: item.children?.filter(() => true),
    })),
  }));
}
