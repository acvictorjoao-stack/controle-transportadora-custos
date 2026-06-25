import * as React from 'react';

import {HeaderLogo} from '@/components/layout/header/header-logo';
import {cn} from '@/lib/utils';

export interface AuthLayoutProps {
  children: React.ReactNode;
  className?: string;
}

function AuthLayout({children, className}: AuthLayoutProps) {
  return (
    <div
      data-slot="auth-layout"
      className={cn(
        'flex min-h-screen flex-col items-center justify-center bg-background p-6',
        className,
      )}
    >
      <div className="mb-8">
        <HeaderLogo />
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}

export {AuthLayout};
