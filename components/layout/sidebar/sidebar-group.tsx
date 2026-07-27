'use client';

import {ChevronDown} from 'lucide-react';

import {SIDEBAR_ACCORDION_DURATION_MS} from '@/constants/app/sidebar';
import {useSidebar} from '@/contexts/shell/use-sidebar';
import type {NavGroup, NavItem} from '@/types/global/navigation';
import {cn} from '@/lib/utils';

import {SidebarItem} from './sidebar-item';

export interface SidebarGroupProps {
  group: NavGroup;
  items: NavItem[];
  open: boolean;
  active: boolean;
  onToggle: () => void;
  pathname: string;
  hash?: string;
}

function SidebarGroup({
  group,
  items,
  open,
  active,
  onToggle,
  pathname,
  hash = '',
}: SidebarGroupProps) {
  const {collapsed} = useSidebar();
  const GroupIcon = group.icon;
  const panelId = `sidebar-group-panel-${group.id}`;
  const headerId = `sidebar-group-header-${group.id}`;

  if (collapsed) {
    return (
      <div
        data-slot="sidebar-group"
        data-collapsed="true"
        className="space-y-0.5"
      >
        {items.map((item) => (
          <SidebarItem
            key={item.id}
            item={item}
            pathname={pathname}
            hash={hash}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      data-slot="sidebar-group"
      data-open={open || undefined}
      data-active={active || undefined}
      className="relative"
    >
      <button
        id={headerId}
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className={cn(
          'flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-left transition-colors duration-200',
          active
            ? 'text-sidebar-accent-foreground'
            : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
        )}
      >
        {GroupIcon ? (
          <GroupIcon
            className={cn(
              'size-4 shrink-0',
              active ? 'text-primary' : 'opacity-70',
            )}
            aria-hidden="true"
          />
        ) : null}
        <span className="min-w-0 flex-1 truncate text-[11px] font-semibold uppercase tracking-wider">
          {group.label}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            'size-3.5 shrink-0 opacity-50 transition-transform ease-out',
            open && 'rotate-180',
          )}
          style={{transitionDuration: `${SIDEBAR_ACCORDION_DURATION_MS}ms`}}
        />
      </button>

      <div
        id={panelId}
        role="region"
        aria-labelledby={headerId}
        className="grid transition-[grid-template-rows] ease-out"
        style={{
          gridTemplateRows: open ? '1fr' : '0fr',
          transitionDuration: `${SIDEBAR_ACCORDION_DURATION_MS}ms`,
        }}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-0.5 pb-1 pl-1 pr-0.5 pt-0.5">
            {items.map((item) => (
              <SidebarItem
                key={item.id}
                item={item}
                pathname={pathname}
                hash={hash}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export {SidebarGroup};
