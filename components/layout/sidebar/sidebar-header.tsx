'use client';

import {PanelLeftClose, PanelLeftOpen, Truck} from 'lucide-react';
import Link from 'next/link';

import {Button} from '@/components/ui/button';
import {siteConfig} from '@/config/site/index';
import {ROUTES} from '@/constants/routes/paths';
import {useSidebar} from '@/contexts/shell/use-sidebar';
import {useIsMobile} from '@/hooks/use-mobile';
import {cn} from '@/lib/utils';

function SidebarHeader() {
  const {collapsed, toggleCollapsed} = useSidebar();
  const isMobile = useIsMobile();

  return (
    <div
      data-slot="sidebar-header"
      className={cn(
        'flex shrink-0 items-center gap-2 border-b border-sidebar-border bg-sidebar px-3 py-3.5',
        collapsed ? 'flex-col justify-center' : 'justify-between',
        isMobile && !collapsed && 'pr-12',
      )}
    >
      <Link
        href={ROUTES.home}
        aria-label={collapsed ? siteConfig.name : undefined}
        className={cn(
          'flex min-w-0 items-center gap-3 transition-opacity hover:opacity-90',
          collapsed && 'justify-center',
        )}
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-accent-foreground shadow-sm">
          <Truck className="size-4" aria-hidden="true" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-sidebar-accent-foreground">
              {siteConfig.name}
            </p>
            <p className="truncate text-[11px] leading-tight text-sidebar-muted">
              {siteConfig.tagline}
            </p>
          </div>
        )}
      </Link>
      {!isMobile && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
          className={cn(
            'shrink-0 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            collapsed && 'mx-auto',
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </Button>
      )}
    </div>
  );
}

export {SidebarHeader};
