import type {ReactNode} from 'react';

import {cn} from '@/lib/utils';

export type ExecutiveKpiAccent =
  | 'primary'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'muted';

const ACCENT_ICON: Record<ExecutiveKpiAccent, string> = {
  primary: 'bg-accent text-accent-foreground',
  info: 'bg-accent text-accent-foreground',
  success: 'bg-success/12 text-success',
  warning: 'bg-warning/12 text-warning',
  danger: 'bg-destructive/12 text-destructive',
  muted: 'bg-muted text-muted-foreground',
};

export interface ExecutiveKpiCardProps {
  title: string;
  value: ReactNode;
  subtitle?: ReactNode;
  accent?: ExecutiveKpiAccent;
  icon?: ReactNode;
  /** `lg` para os indicadores principais; `md` para os de apoio. */
  size?: 'lg' | 'md';
  valueClassName?: string;
  className?: string;
}

function ExecutiveKpiCard({
  title,
  value,
  subtitle,
  accent = 'primary',
  icon,
  size = 'lg',
  valueClassName,
  className,
}: ExecutiveKpiCardProps) {
  return (
    <div
      data-slot="executive-kpi-card"
      className={cn(
        'flex h-full flex-col rounded-xl border border-border bg-card p-5 shadow-card',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-sm font-medium text-muted-foreground">
          {title}
        </p>
        {icon ? (
          <span
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-lg',
              ACCENT_ICON[accent],
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p
        className={cn(
          'mt-2 whitespace-nowrap font-financial font-semibold tracking-tight text-foreground',
          size === 'lg' ? 'text-2xl xl:text-xl 2xl:text-[1.75rem]' : 'text-xl',
          valueClassName,
        )}
        data-financial="true"
      >
        {value}
      </p>
      {subtitle ? (
        <p className="mt-auto pt-2 text-xs text-muted-foreground">{subtitle}</p>
      ) : null}
    </div>
  );
}

export {ExecutiveKpiCard};
