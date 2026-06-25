'use client';

import {Menu, Plus} from 'lucide-react';

import {Breadcrumb} from '@/components/layout/breadcrumb/breadcrumb';
import {HeaderLogo} from '@/components/layout/header/header-logo';
import {HeaderNotifications} from '@/components/layout/header/header-notifications';
import {HeaderSearch} from '@/components/layout/header/header-search';
import {HeaderThemeToggle} from '@/components/layout/header/header-theme-toggle';
import {HeaderUserMenu} from '@/components/layout/header/header-user-menu';
import {Button} from '@/components/ui/button';
import {useSidebar} from '@/contexts/shell/use-sidebar';
import {useIsMobile} from '@/hooks/use-mobile';
import {cn} from '@/lib/utils';

export interface AppHeaderProps {
  className?: string;
}

function AppHeader({className}: AppHeaderProps) {
  const {toggleMobile} = useSidebar();
  const isMobile = useIsMobile();

  return (
    <header
      data-slot="app-header"
      className={cn(
        'sticky top-0 z-[var(--z-sticky)] flex h-14 shrink-0 items-center gap-4 border-b border-border bg-background/80 px-4 backdrop-blur-md lg:px-6',
        className,
      )}
    >
      <div className="flex items-center gap-3 lg:hidden">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleMobile}
          aria-label="Abrir menu"
        >
          <Menu className="size-4" />
        </Button>
        <HeaderLogo collapsed />
      </div>

      <div className="hidden min-w-0 flex-1 items-center gap-4 lg:flex">
        {!isMobile && <Breadcrumb className="min-w-0" />}
      </div>

      <div className="hidden flex-1 justify-center lg:flex">
        <HeaderSearch />
      </div>

      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="default"
          size="sm"
          className="hidden sm:inline-flex"
          disabled
        >
          <Plus className="size-4" />
          Nova Ação
        </Button>
        <HeaderThemeToggle />
        <HeaderNotifications />
        <HeaderUserMenu />
      </div>
    </header>
  );
}

export {AppHeader};
