'use client';

import {PanelLeftClose, PanelLeftOpen} from 'lucide-react';

import {HeaderLogo} from '@/components/layout/header/header-logo';
import {Button} from '@/components/ui/button';
import {useSidebar} from '@/contexts/shell/use-sidebar';
import {useIsMobile} from '@/hooks/use-mobile';
import {cn} from '@/lib/utils';

function SidebarHeader() {
  const {collapsed, toggleCollapsed} = useSidebar();
  const isMobile = useIsMobile();

  return (
    <div
      className={cn(
        'flex h-14 shrink-0 items-center border-b border-sidebar-border px-3',
        collapsed ? 'justify-center' : 'justify-between',
      )}
    >
      {!collapsed && <HeaderLogo />}
      {!isMobile && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
          className={cn(collapsed && 'mx-auto')}
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
