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
        'flex shrink-0 items-center gap-2 border-b border-white/10 bg-[#0F172A] px-3 py-3.5',
        collapsed ? 'justify-center' : 'justify-between',
        isMobile && !collapsed && 'pr-12',
      )}
    >
      <Link
        href={ROUTES.home}
        className={cn(
          'flex min-w-0 items-center gap-3 transition-opacity hover:opacity-90',
          collapsed && 'justify-center',
        )}
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#1D5EFF] text-white shadow-sm">
          <Truck className="size-4" aria-hidden="true" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-white">
              {siteConfig.name}
            </p>
            <p className="truncate text-[11px] leading-tight text-slate-400">
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
            'shrink-0 text-slate-400 hover:bg-white/10 hover:text-white',
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
