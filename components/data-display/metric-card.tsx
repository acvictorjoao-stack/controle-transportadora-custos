import * as React from 'react';

import {cn} from '@/lib/utils';

export interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  description?: string;
  trend?: {
    value: string;
    positive?: boolean;
  };
  icon?: React.ReactNode;
}

function MetricCard({
  label,
  value,
  description,
  trend,
  icon,
  className,
  ...props
}: MetricCardProps) {
  return (
    <div
      data-slot="metric-card"
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-border bg-card p-6 shadow-card',
        className,
      )}
      {...props}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {icon && (
          <div className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            {icon}
          </div>
        )}
      </div>
      <div className="font-financial text-3xl font-semibold tracking-tight" data-financial="true">
        {value}
      </div>
      {(description || trend) && (
        <div className="flex items-center gap-2 text-sm">
          {trend && (
            <span
              className={cn(
                'font-medium',
                trend.positive ? 'text-success' : 'text-destructive',
              )}
            >
              {trend.value}
            </span>
          )}
          {description && (
            <span className="text-muted-foreground">{description}</span>
          )}
        </div>
      )}
    </div>
  );
}

export {MetricCard};
