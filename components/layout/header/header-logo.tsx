import {Truck} from 'lucide-react';
import Link from 'next/link';

import {siteConfig} from '@/config/site/index';
import {ROUTES} from '@/constants/routes/paths';
import {cn} from '@/lib/utils';

export interface HeaderLogoProps {
  collapsed?: boolean;
  className?: string;
}

function HeaderLogo({collapsed = false, className}: HeaderLogoProps) {
  return (
    <Link
      href={ROUTES.dashboard}
      className={cn(
        'flex items-center gap-2.5 font-semibold tracking-tight transition-opacity hover:opacity-80',
        className,
      )}
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Truck className="size-4" />
      </div>
      {!collapsed && (
        <span className="text-base">{siteConfig.name}</span>
      )}
    </Link>
  );
}

export {HeaderLogo};
