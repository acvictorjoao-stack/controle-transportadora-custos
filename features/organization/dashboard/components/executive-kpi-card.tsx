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
  primary: 'bg-primary/10 text-primary',
  info: 'bg-info/10 text-info',
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
  /** Conteúdo extra à direita do título (ex.: selo). */
  aside?: ReactNode;
  valueClassName?: string;
  className?: string;
}

/** Ícone padronizado dos cards executivos: mesmo tamanho, cantos e opacidade. */
function ExecutiveKpiIcon({
  accent = 'primary',
  children,
}: {
  accent?: ExecutiveKpiAccent;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4',
        ACCENT_ICON[accent],
      )}
    >
      {children}
    </span>
  );
}

function ExecutiveKpiCard({
  title,
  value,
  subtitle,
  accent = 'primary',
  icon,
  size = 'lg',
  aside,
  valueClassName,
  className,
}: ExecutiveKpiCardProps) {
  return (
    <div
      data-slot="executive-kpi-card"
      className={cn(
        '@container flex h-full min-w-0 flex-col rounded-xl border border-border bg-card shadow-card',
        size === 'lg' ? 'px-4 py-4' : 'px-4 py-3.5',
        className,
      )}
    >
      <div className="flex items-center gap-2.5">
        {icon ? <ExecutiveKpiIcon accent={accent}>{icon}</ExecutiveKpiIcon> : null}
        <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-muted-foreground">
          {title}
        </p>
        {aside}
      </div>
      <p
        className={cn(
          'mt-3 truncate font-financial font-semibold leading-none tracking-tight text-foreground',
          // O tamanho acompanha a largura do card (container query), não a da tela:
          // valores de sete dígitos cabem em qualquer coluna sem corte.
          size === 'lg'
            ? 'text-xl @[14rem]:text-[1.375rem] @[16rem]:text-2xl @[19rem]:text-[1.75rem]'
            : 'text-lg @[14rem]:text-xl',
          valueClassName,
        )}
        data-financial="true"
      >
        {value}
      </p>
      {subtitle ? (
        <p className="mt-auto pt-2.5 text-xs leading-snug text-muted-foreground">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

export {ExecutiveKpiCard, ExecutiveKpiIcon};
