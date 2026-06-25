import * as React from 'react';

import {cn} from '@/lib/utils';

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  footer?: React.ReactNode;
}

function StatCard({
  title,
  value,
  subtitle,
  footer,
  className,
  children,
  ...props
}: StatCardProps) {
  return (
    <div
      data-slot="stat-card"
      className={cn(
        'rounded-xl border border-border bg-card p-5 shadow-card',
        className,
      )}
      {...props}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <p
        className="mt-2 font-financial text-2xl font-semibold tracking-tight"
        data-financial="true"
      >
        {value}
      </p>
      {subtitle && (
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      )}
      {children}
      {footer && (
        <div className="mt-4 border-t border-border pt-4">{footer}</div>
      )}
    </div>
  );
}

export {StatCard};
