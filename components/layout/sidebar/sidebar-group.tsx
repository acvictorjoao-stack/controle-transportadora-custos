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

  if (collapsed) {
    return (
      <div data-slot="sidebar-group" data-collapsed="true" className="space-y-0.5">
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
      className={cn(
        'relative overflow-hidden rounded-lg transition-colors duration-200',
        open && 'bg-sidebar-accent/40',
        active && 'bg-sidebar-accent/55',
      )}
    >
      {active && (
        <span
          aria-hidden="true"
          className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-primary"
        />
      )}

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          'flex w-full items-center gap-2 px-3 py-2 text-left transition-colors duration-200',
          active
            ? 'text-sidebar-accent-foreground'
            : 'text-sidebar-foreground/80 hover:text-sidebar-accent-foreground',
        )}
      >
        {GroupIcon && <GroupIcon className="size-4 shrink-0 opacity-80" />}
        <span className="min-w-0 flex-1 truncate text-xs font-semibold uppercase tracking-wider">
          {group.label}
        </span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 opacity-50 transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>

      <div
        className="grid transition-[grid-template-rows] ease-out"
        style={{
          gridTemplateRows: open ? '1fr' : '0fr',
          transitionDuration: `${SIDEBAR_ACCORDION_DURATION_MS}ms`,
        }}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-0.5 px-1.5 pb-1.5">
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
