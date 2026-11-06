import * as React from 'react';

import {cn} from '@/lib/utils';

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  footer?: React.ReactNode;
  /** Ícone opcional no canto superior direito. */
  icon?: React.ReactNode;
}

function StatCard({
  title,
  value,
  subtitle,
  footer,
  icon,
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
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-sm font-medium text-muted-foreground">
          {title}
        </p>
        {icon && (
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground [&_svg]:size-4">
            {icon}
          </div>
        )}
      </div>
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
