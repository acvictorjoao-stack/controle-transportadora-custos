'use client';

import {ChevronDown, ChevronRight} from 'lucide-react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import * as React from 'react';

import {useSidebar} from '@/contexts/shell/use-sidebar';
import {hasPermission, useNavPermissions} from '@/hooks/use-nav-permissions';
import {isNavItemActive} from '@/lib/navigation/breadcrumb';
import type {NavItem} from '@/types/global/navigation';
import {cn} from '@/lib/utils';

export interface SidebarNavItemProps {
  item: NavItem;
  depth?: number;
}

function SidebarNavItem({item, depth = 0}: SidebarNavItemProps) {
  const pathname = usePathname();
  const {collapsed} = useSidebar();
  const permissions = useNavPermissions();
  const [submenuOpen, setSubmenuOpen] = React.useState(false);

  const isActive = isNavItemActive(pathname, item.href);
  const hasChildren = item.children && item.children.length > 0;
  const isChildActive = item.children?.some((child) =>
    isNavItemActive(pathname, child.href),
  );

  const [prevIsChildActive, setPrevIsChildActive] = React.useState(isChildActive);
  if (isChildActive !== prevIsChildActive) {
    setPrevIsChildActive(isChildActive);
    if (isChildActive) {
      setSubmenuOpen(true);
    }
  }

  if (!hasPermission(item.permission, permissions)) return null;

  const Icon = item.icon;

  if (hasChildren) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setSubmenuOpen((prev) => !prev)}
          title={collapsed ? item.title : undefined}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            (isActive || isChildActive)
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            collapsed && 'justify-center px-2',
          )}
        >
          <Icon className="size-4 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 truncate text-left">{item.title}</span>
              {submenuOpen ? (
                <ChevronDown className="size-4 shrink-0 opacity-50" />
              ) : (
                <ChevronRight className="size-4 shrink-0 opacity-50" />
              )}
            </>
          )}
        </button>
        {submenuOpen && !collapsed && (
          <div className="ml-4 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-3">
            {item.children!.map((child) => (
              <SidebarNavItem key={child.id} item={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      title={collapsed ? item.title : undefined}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        collapsed && 'justify-center px-2',
        depth > 0 && 'py-1.5',
      )}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && <span className="truncate">{item.title}</span>}
    </Link>
  );
}

export {SidebarNavItem};
