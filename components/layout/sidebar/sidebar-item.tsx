'use client';

import Link from 'next/link';
import * as React from 'react';

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
  const isActive = isNavItemActive(pathname, item.href, hash);
  const Icon = item.icon;
  const badgeTone =
    typeof item.badge === 'number' ? ('count' as const) : ('label' as const);

  const content = (
    <>
      <Icon className="size-4 shrink-0" />
      {!collapsed && (
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate">{item.title}</span>
          <SidebarBadge value={item.badge} tone={badgeTone} />
        </span>
      )}
    </>
  );

  const className = cn(
    'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200',
    isActive
      ? 'bg-primary/10 text-primary'
      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground',
    collapsed && 'justify-center px-2',
    depth > 0 && 'py-1.5 text-[13px]',
    item.disabled &&
      'cursor-not-allowed opacity-55 hover:bg-transparent hover:text-sidebar-foreground/70',
  );

  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      setMobileOpen(false);

      const {path, hash: targetHash} = splitNavHref(item.href);
      if (!targetHash || path !== pathname) return;

      // Mesma rota: força hash + scroll (Next.js nem sempre dispara hashchange)
      event.preventDefault();
      const nextHash = `#${targetHash}`;
      if (window.location.hash !== nextHash) {
        window.history.pushState(null, '', `${path}${nextHash}`);
      }
      window.dispatchEvent(new Event('hashchange'));
      const el = document.getElementById(targetHash);
      el?.scrollIntoView({behavior: 'smooth', block: 'start'});
    },
    [item.href, pathname, setMobileOpen],
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
      href={item.href}
      title={collapsed ? item.title : undefined}
      className={className}
      onClick={handleClick}
    >
      {content}
    </Link>
  );
}

export {SidebarItem};
