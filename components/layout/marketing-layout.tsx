import * as React from 'react';

import {HeaderLogo} from '@/components/layout/header/header-logo';
import {siteConfig} from '@/config/site/index';
import {cn} from '@/lib/utils';

export interface MarketingLayoutProps {
  children: React.ReactNode;
  className?: string;
}

function MarketingLayout({children, className}: MarketingLayoutProps) {
  return (
    <div
      data-slot="marketing-layout"
      className={cn('flex min-h-screen flex-col bg-background', className)}
    >
      <header className="flex h-16 items-center justify-between border-b border-border px-6">
        <HeaderLogo />
        <nav className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{siteConfig.tagline}</span>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border px-6 py-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} {siteConfig.name}
      </footer>
    </div>
  );
}

export {MarketingLayout};
