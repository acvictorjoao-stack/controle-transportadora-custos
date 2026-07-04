import {Truck} from 'lucide-react';

import {siteConfig} from '@/config/site/index';
import {cn} from '@/lib/utils';

export interface AuthLogoProps {
  className?: string;
  showName?: boolean;
}

function AuthLogo({className, showName = true}: AuthLogoProps) {
  return (
    <div
      data-slot="auth-logo"
      className={cn('flex flex-col items-center gap-3', className)}
    >
      <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
        <Truck className="size-6" aria-hidden="true" />
      </div>
      {showName && (
        <div className="text-center">
          <p className="text-xl font-semibold tracking-tight">{siteConfig.name}</p>
          <p className="text-sm text-muted-foreground">{siteConfig.tagline}</p>
        </div>
      )}
    </div>
  );
}

export {AuthLogo};
