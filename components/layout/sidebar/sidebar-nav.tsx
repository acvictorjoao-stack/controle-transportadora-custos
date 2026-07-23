'use client';

import {usePathname} from 'next/navigation';
import * as React from 'react';

import {navigationGroups} from '@/config/navigation';
import {useSidebarAccordion} from '@/hooks/use-sidebar-accordion';
import {hasPermission, useNavPermissions} from '@/hooks/use-nav-permissions';
import {filterNavByPermissions} from '@/lib/navigation/filter-nav';
import {isNavGroupActive} from '@/lib/navigation/breadcrumb';

import {SidebarGroup} from './sidebar-group';

function subscribeHash(onStoreChange: () => void) {
  window.addEventListener('hashchange', onStoreChange);
  window.addEventListener('popstate', onStoreChange);
  return () => {
    window.removeEventListener('hashchange', onStoreChange);
    window.removeEventListener('popstate', onStoreChange);
  };
}

function getHashSnapshot() {
  return window.location.hash;
}

function getHashServerSnapshot() {
  return '';
}

function useLocationHash() {
  return React.useSyncExternalStore(
    subscribeHash,
    getHashSnapshot,
    getHashServerSnapshot,
  );
}

function SidebarNav() {
  const pathname = usePathname();
  const hash = useLocationHash();
  const permissions = useNavPermissions();
  const groups = filterNavByPermissions(navigationGroups, permissions);

  const visibleGroups = groups
    .map((group) => {
      if (group.permission && !hasPermission(group.permission, permissions)) {
        return null;
      }

      const items = group.items.filter((item) =>
        hasPermission(item.permission, permissions),
      );

      if (items.length === 0) return null;
      return {...group, items};
    })
    .filter((group): group is NonNullable<typeof group> => group !== null);

  const activeGroupIds = visibleGroups
    .filter((group) => isNavGroupActive(pathname, group.items, hash))
    .map((group) => group.id);

  const {isOpen, toggle} = useSidebarAccordion(visibleGroups, activeGroupIds);

  return (
    <nav
      data-slot="sidebar-nav"
      className="flex-1 space-y-1 overflow-y-auto px-2 py-3"
    >
      {visibleGroups.map((group) => {
        const active = activeGroupIds.includes(group.id);
        return (
          <SidebarGroup
            key={group.id}
            group={group}
            items={group.items}
            open={isOpen(group.id)}
            active={active}
            onToggle={() => toggle(group.id)}
            pathname={pathname}
            hash={hash}
          />
        );
      })}
    </nav>
  );
}

export {SidebarNav};
