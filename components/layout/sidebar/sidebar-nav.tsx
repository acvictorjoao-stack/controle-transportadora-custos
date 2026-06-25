'use client';

import {navigationGroups} from '@/config/navigation';
import {useSidebar} from '@/contexts/shell/use-sidebar';
import {filterNavByPermissions} from '@/lib/navigation/filter-nav';
import {hasPermission, useNavPermissions} from '@/hooks/use-nav-permissions';
import {cn} from '@/lib/utils';

import {SidebarNavItem} from './sidebar-nav-item';

function SidebarNav() {
  const {collapsed} = useSidebar();
  const permissions = useNavPermissions();
  const groups = filterNavByPermissions(navigationGroups, permissions);

  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {groups.map((group) => {
        if (group.permission && !hasPermission(group.permission, permissions)) {
          return null;
        }

        const visibleItems = group.items.filter((item) =>
          hasPermission(item.permission, permissions),
        );

        if (visibleItems.length === 0) return null;

        return (
          <div key={group.id}>
            {!collapsed && (
              <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {group.label}
              </p>
            )}
            <div className={cn('space-y-0.5', collapsed && 'space-y-1')}>
              {visibleItems.map((item) => (
                <SidebarNavItem key={item.id} item={item} />
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

export {SidebarNav};
