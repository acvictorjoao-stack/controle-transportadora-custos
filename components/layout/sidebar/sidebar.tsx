'use client';

import {X} from 'lucide-react';

import {Button} from '@/components/ui/button';
import {
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_EXPANDED,
} from '@/constants/app/sidebar';
import {useSidebar} from '@/contexts/shell/use-sidebar';
import {useIsMobile} from '@/hooks/use-mobile';
import {cn} from '@/lib/utils';

import {SidebarFooter} from './sidebar-footer';
import {SidebarHeader} from './sidebar-header';
import {SidebarNav} from './sidebar-nav';
import {SidebarQuickActions} from './sidebar-quick-actions';

function Sidebar() {
  const {collapsed, mobileOpen, setMobileOpen} = useSidebar();
  const isMobile = useIsMobile();

  const sidebarContent = (
    <aside
      data-slot="sidebar"
      style={{
        width: isMobile
          ? SIDEBAR_WIDTH_EXPANDED
          : collapsed
            ? SIDEBAR_WIDTH_COLLAPSED
            : SIDEBAR_WIDTH_EXPANDED,
      }}
      className={cn(
        'flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-accent-foreground transition-[width] duration-300',
      )}
    >
      <div className="relative flex shrink-0 items-start">
        <div className="min-w-0 flex-1">
          <SidebarHeader />
        </div>
        {isMobile && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="absolute right-2 top-3 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
      <SidebarQuickActions />
      <SidebarNav />
      <SidebarFooter />
    </aside>
  );

  if (isMobile) {
    return (
      <>
        {mobileOpen && (
          <div
            className="fixed inset-0 z-[var(--z-overlay)] bg-black/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}
        <div
          className={cn(
            'fixed inset-y-0 left-0 z-[var(--z-modal)] transition-transform duration-300 lg:hidden',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          {sidebarContent}
        </div>
      </>
    );
  }

  return sidebarContent;
}

export {Sidebar};
