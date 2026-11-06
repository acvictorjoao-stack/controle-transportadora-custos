'use client';

import {PanelLeftClose, PanelLeftOpen, Shield} from 'lucide-react';

import {Button} from '@/components/ui/button';
import {useSidebar} from '@/contexts/shell/use-sidebar';
import {useIsMobile} from '@/hooks/use-mobile';
import {cn} from '@/lib/utils';

function MasterSidebarHeader() {
  const {collapsed, toggleCollapsed} = useSidebar();
  const isMobile = useIsMobile();

  return (
    <div
      className={cn(
        'flex h-14 shrink-0 items-center border-b border-sidebar-border px-3',
        collapsed ? 'justify-center' : 'justify-between',
      )}
    >
      {!collapsed && (
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Shield className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-sidebar-accent-foreground">FleetControl</p>
            <p className="truncate text-[10px] text-sidebar-muted">
              Portal Master
            </p>
          </div>
        </div>
      )}
      {!isMobile && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
          className={cn(
            'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
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

export {MasterSidebarHeader};
