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

import {MasterSidebarFooter} from './master-sidebar-footer';
import {MasterSidebarHeader} from './master-sidebar-header';
import {MasterSidebarNav} from './master-sidebar-nav';

function MasterSidebar() {
  const {collapsed, mobileOpen, setMobileOpen} = useSidebar();
  const isMobile = useIsMobile();

  const sidebarContent = (
    <aside
      data-slot="master-sidebar"
      style={{
        width: isMobile
          ? SIDEBAR_WIDTH_EXPANDED
          : collapsed
            ? SIDEBAR_WIDTH_COLLAPSED
            : SIDEBAR_WIDTH_EXPANDED,
      }}
      className={cn(
        'flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-300',
      )}
    >
      <div className="flex items-center justify-between lg:block">
        <MasterSidebarHeader />
        {isMobile && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="mr-2 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
      <MasterSidebarNav />
      <MasterSidebarFooter />
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

export {MasterSidebar};
