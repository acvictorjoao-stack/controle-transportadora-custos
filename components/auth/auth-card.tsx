import * as React from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {cn} from '@/lib/utils';

import {AuthLogo} from './auth-logo';

export interface AuthCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  showLogo?: boolean;
}

function AuthCard({
  title,
  description,
  children,
  className,
  showLogo = true,
}: AuthCardProps) {
  return (
    <Card data-slot="auth-card" className={cn('w-full shadow-card', className)}>
      <CardHeader className="items-center text-center">
        {showLogo && <AuthLogo className="mb-2" />}
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export {AuthCard};
