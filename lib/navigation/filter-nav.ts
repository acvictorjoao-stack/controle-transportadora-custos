import {hasPermission} from '@/hooks/use-nav-permissions';
import type {NavGroup, NavItem, Permission} from '@/types/global/navigation';

function filterNavItemChildren(
  children: NavItem['children'],
  permissions: Permission[],
): NavItem['children'] {
  if (!children) return undefined;

  const visibleChildren = children.filter((child) =>
    hasPermission(child.permission, permissions),
  );

  return visibleChildren.length > 0 ? visibleChildren : undefined;
}

function filterNavItems(
  items: NavItem[],
  permissions: Permission[],
): NavItem[] {
  const filtered: NavItem[] = [];

  for (const item of items) {
    if (!hasPermission(item.permission, permissions)) {
      continue;
    }

    const children = filterNavItemChildren(item.children, permissions);
    if (item.children && !children) {
      continue;
    }

    filtered.push({...item, children});
  }

  return filtered;
}

/**
 * Filtra navegação por permissões do usuário.
 */
export function filterNavByPermissions(
  groups: NavGroup[],
  permissions: Permission[] = [],
): NavGroup[] {
  const filtered: NavGroup[] = [];

  for (const group of groups) {
    if (group.permission && !hasPermission(group.permission, permissions)) {
      continue;
    }

    const items = filterNavItems(group.items, permissions);
    if (items.length === 0) {
      continue;
    }

    filtered.push({...group, items});
  }

  return filtered;
}
