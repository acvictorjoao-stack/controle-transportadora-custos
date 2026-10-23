'use client';

import {ChevronDown, ChevronRight} from 'lucide-react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import * as React from 'react';

import {Badge} from '@/components/ui/badge';
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
        <div
          className={cn(
            'flex w-full items-center rounded-lg transition-colors',
            isActive || isChildActive
              ? 'bg-[#1D5EFF] text-white'
              : 'text-slate-300 hover:bg-white/5 hover:text-white',
          )}
        >
          <Link
            href={item.href}
            prefetch
            title={collapsed ? item.title : undefined}
            className={cn(
              'flex min-w-0 flex-1 items-center gap-3 px-3 py-2 text-sm font-medium',
              collapsed && 'justify-center px-2',
            )}
          >
            <Icon
              className={cn(
                'size-4 shrink-0',
                isActive || isChildActive ? 'text-white' : 'text-slate-400',
              )}
            />
            {!collapsed && (
              <span className="flex flex-1 items-center gap-2 truncate text-left">
                <span className="truncate">{item.title}</span>
                {item.badge && (
                  <Badge
                    variant="secondary"
                    className="ml-auto shrink-0 border-transparent bg-white/10 px-1.5 py-0 text-[10px] text-slate-200"
                  >
                    {item.badge}
                  </Badge>
                )}
              </span>
            )}
          </Link>
          {!collapsed && (
            <button
              type="button"
              onClick={() => setSubmenuOpen((prev) => !prev)}
              aria-label={submenuOpen ? 'Recolher submenu' : 'Expandir submenu'}
              className="mr-1 rounded-md p-1.5 hover:bg-white/10"
            >
              {submenuOpen ? (
                <ChevronDown className="size-4 shrink-0 opacity-50" />
              ) : (
                <ChevronRight className="size-4 shrink-0 opacity-50" />
              )}
            </button>
          )}
        </div>
        {submenuOpen && !collapsed && (
          <div className="ml-4 mt-0.5 space-y-0.5 border-l border-white/10 pl-3">
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
      prefetch
      title={collapsed ? item.title : undefined}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-[#1D5EFF] text-white'
          : 'text-slate-300 hover:bg-white/5 hover:text-white',
        collapsed && 'justify-center px-2',
        depth > 0 && 'py-1.5',
      )}
    >
      <Icon
        className={cn(
          'size-4 shrink-0',
          isActive ? 'text-white' : 'text-slate-400',
        )}
      />
      {!collapsed && (
        <span className="flex flex-1 items-center gap-2 truncate">
          <span className="truncate">{item.title}</span>
          {item.badge && (
            <Badge
              variant="secondary"
              className="ml-auto shrink-0 border-transparent bg-white/10 px-1.5 py-0 text-[10px] text-slate-200"
            >
              {item.badge}
            </Badge>
          )}
        </span>
      )}
    </Link>
  );
}

export {SidebarNavItem};
