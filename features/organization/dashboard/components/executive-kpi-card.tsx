import type {ReactNode} from 'react';

import {cn} from '@/lib/utils';

export type ExecutiveKpiAccent =
  | 'primary'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'muted';

const ACCENT_BAR: Record<ExecutiveKpiAccent, string> = {
  primary: 'bg-primary',
  info: 'bg-sky-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-destructive',
  muted: 'bg-muted-foreground/40',
};

export interface ExecutiveKpiCardProps {
  title: string;
  value: ReactNode;
  subtitle?: ReactNode;
  accent?: ExecutiveKpiAccent;
  icon?: ReactNode;
  valueClassName?: string;
  className?: string;
}

function ExecutiveKpiCard({
  title,
  value,
  subtitle,
  accent = 'primary',
  icon,
  valueClassName,
  className,
}: ExecutiveKpiCardProps) {
  return (
    <div
      data-slot="executive-kpi-card"
      className={cn(
        'relative flex h-full min-h-[7.5rem] flex-col overflow-hidden rounded-xl border border-border bg-card p-4 shadow-card',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn('absolute inset-y-0 left-0 w-1', ACCENT_BAR[accent])}
      />
      <div className="flex items-start justify-between gap-2 pl-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
        {icon ? (
          <span className="shrink-0 text-muted-foreground/70">{icon}</span>
        ) : null}
      </div>
      <p
        className={cn(
          'mt-2 pl-2 font-financial text-2xl font-semibold tracking-tight text-foreground',
          valueClassName,
        )}
        data-financial="true"
      >
        {value}
      </p>
      {subtitle ? (
        <p className="mt-auto pt-2 pl-2 text-xs text-muted-foreground">{subtitle}</p>
      ) : (
        <div className="mt-auto" />
      )}
    </div>
  );
}

export {ExecutiveKpiCard};
