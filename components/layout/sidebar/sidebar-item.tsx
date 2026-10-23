'use client';

import Link from 'next/link';
import * as React from 'react';

import {useNavigationPending} from '@/contexts/navigation/use-navigation-pending';
import {useSidebar} from '@/contexts/shell/use-sidebar';
import {isNavItemActive, splitNavHref} from '@/lib/navigation/breadcrumb';
import type {NavItem} from '@/types/global/navigation';
import {cn} from '@/lib/utils';

import {SidebarBadge} from './sidebar-badge';

export interface SidebarItemProps {
  item: NavItem;
  pathname: string;
  hash?: string;
  depth?: number;
}

function SidebarItem({item, pathname, hash = '', depth = 0}: SidebarItemProps) {
  const {collapsed, setMobileOpen} = useSidebar();
  const {isPending, startNavigation} = useNavigationPending();
  const routePending = isPending(item.href);
  const isActive = isNavItemActive(pathname, item.href, hash) || routePending;
  const Icon = item.icon;
  const badgeTone =
    typeof item.badge === 'number' ? ('count' as const) : ('label' as const);

  const content = (
    <>
      <Icon
        className={cn(
          'size-4 shrink-0 transition-colors duration-200',
          isActive ? 'text-white' : 'text-slate-400',
        )}
        aria-hidden="true"
      />
      {!collapsed && (
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span className={cn('truncate', isActive && 'font-semibold')}>
            {item.title}
          </span>
          <SidebarBadge
            value={item.badge}
            tone={badgeTone}
            className={cn(
              'ml-auto',
              isActive &&
                'border-transparent bg-white/20 text-white hover:bg-white/20',
              !isActive &&
                badgeTone === 'count' &&
                'border-transparent bg-white/10 text-slate-300',
            )}
          />
        </span>
      )}
    </>
  );

  const className = cn(
    'relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors duration-200',
    isActive
      ? 'bg-[#1D5EFF] font-medium text-white shadow-sm'
      : 'font-medium text-slate-300 hover:bg-white/5 hover:text-white',
    collapsed && 'justify-center px-2',
    depth > 0 && 'py-1.5 text-[13px]',
    item.disabled &&
      'cursor-not-allowed opacity-55 hover:bg-transparent hover:text-slate-300',
  );

  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      setMobileOpen(false);

      const {path, hash: targetHash} = splitNavHref(item.href);
      if (targetHash && path === pathname) {
        event.preventDefault();
        const nextHash = `#${targetHash}`;
        if (window.location.hash !== nextHash) {
          window.history.pushState(null, '', `${path}${nextHash}`);
        }
        window.dispatchEvent(new Event('hashchange'));
        const el = document.getElementById(targetHash);
        el?.scrollIntoView({behavior: 'smooth', block: 'start'});
        return;
      }

      startNavigation(item.href);
    },
    [item.href, pathname, setMobileOpen, startNavigation],
  );

  if (item.disabled) {
    return (
      <span
        data-slot="sidebar-item"
        data-active={isActive || undefined}
        data-disabled="true"
        title={collapsed ? item.title : undefined}
        className={className}
        aria-disabled="true"
      >
        {content}
      </span>
    );
  }

  return (
    <Link
      data-slot="sidebar-item"
      data-active={isActive || undefined}
      data-pending={routePending || undefined}
      href={item.href}
      prefetch
      title={collapsed ? item.title : undefined}
      aria-current={isActive ? 'page' : undefined}
      aria-busy={routePending || undefined}
      className={className}
      onClick={handleClick}
    >
      {content}
    </Link>
  );
}

export {SidebarItem};
