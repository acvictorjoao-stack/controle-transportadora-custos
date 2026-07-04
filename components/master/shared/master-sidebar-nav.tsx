'use client';

import {masterNavigationGroups} from '@/config/navigation/master-modules';
import {useSidebar} from '@/contexts/shell/use-sidebar';
import {hasPermission, useNavPermissions} from '@/hooks/use-nav-permissions';
import {cn} from '@/lib/utils';

import {SidebarNavItem} from '@/components/layout/sidebar/sidebar-nav-item';

function MasterSidebarNav() {
  const {collapsed} = useSidebar();
  const permissions = useNavPermissions();

  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {masterNavigationGroups.map((group) => {
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

export {MasterSidebarNav};
