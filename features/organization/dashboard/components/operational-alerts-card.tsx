import {ArrowDownRight, ArrowUpRight, ChevronRight, Info, OctagonAlert, TriangleAlert} from 'lucide-react';
import Link from 'next/link';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {buildCrossNavHref} from '@/features/analytics-nav/utils/shared-filters';
import type {SharedAnalyticsFilters} from '@/features/analytics-nav/types';
import {formatCurrencyBr, formatPercent} from '@/features/financial/utils/financial-format';
import {cn} from '@/lib/utils';

import type {
  OperationalAlertItem,
  OperationalAlertTarget,
  OperationalAlertVariant,
} from '../utils/alerts';

/** Criticidade exibida para cada variante, da mais grave para a mais leve. */
const SEVERITY: Record<
  OperationalAlertVariant,
  {order: number; label: string; plural: string; Icon: typeof Info; row: string; icon: string; chip: string}
> = {
  destructive: {
    order: 0,
    label: 'Crítico',
    plural: 'críticos',
    Icon: OctagonAlert,
    row: 'border-l-destructive',
    icon: 'text-destructive',
    chip: 'bg-destructive/10 text-destructive',
  },
  warning: {
    order: 1,
    label: 'Atenção',
    plural: 'de atenção',
    Icon: TriangleAlert,
    row: 'border-l-warning',
    icon: 'text-warning',
    chip: 'bg-warning/12 text-warning',
  },
  info: {
    order: 2,
    label: 'Informativo',
    plural: 'informativos',
    Icon: Info,
    row: 'border-l-info',
    icon: 'text-info',
    chip: 'bg-info/10 text-info',
  },
};

export interface OperationalAlertsCardProps {
  alerts: OperationalAlertItem[];
  /** Filtros do dashboard, repassados aos atalhos de análise. */
  filters?: SharedAnalyticsFilters;
}

function targetHref(
  target: OperationalAlertTarget | undefined,
  filters: SharedAnalyticsFilters,
): string | null {
  if (!target) return null;
  if (target.kind === 'path') return target.href;
  if (target.kind === 'route') {
    return buildCrossNavHref('rentabilidade-rotas', filters, {routeId: target.routeId});
  }
  return buildCrossNavHref('rentabilidade-clientes', filters, {
    customerId: target.customerId,
  });
}

function OperationalAlertsCard({alerts, filters = {}}: OperationalAlertsCardProps) {
  const sorted = alerts
    .map((alert, index) => ({alert, index}))
    .sort(
      (a, b) =>
        SEVERITY[a.alert.variant].order - SEVERITY[b.alert.variant].order ||
        a.index - b.index,
    )
    .map(({alert}) => alert);

  const counts = (Object.keys(SEVERITY) as OperationalAlertVariant[])
    .map((variant) => ({
      variant,
      count: alerts.filter((alert) => alert.variant === variant).length,
    }))
    .filter((item) => item.count > 0);

  return (
    <Card className="gap-4 py-5">
      <CardHeader className="px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Alertas Inteligentes</CardTitle>
          {counts.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {counts.map(({variant, count}) => (
                <span
                  key={variant}
                  className={cn(
                    'rounded-md px-2 py-0.5 text-[11px] font-semibold',
                    SEVERITY[variant].chip,
                  )}
                >
                  {count}{' '}
                  {count === 1
                    ? SEVERITY[variant].label.toLowerCase()
                    : SEVERITY[variant].plural}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <CardDescription>Sinais para tomada de decisão, do mais crítico ao informativo</CardDescription>
      </CardHeader>
      <CardContent className="px-5">
        {sorted.length === 0 ? (
          <p className="rounded-lg bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
            Nenhum alerta operacional no momento.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sorted.map((alert) => {
              const severity = SEVERITY[alert.variant];
              const href = targetHref(alert.target, filters);
              const change = alert.comparison?.changePercent ?? null;
              return (
                <li
                  key={alert.id}
                  className={cn(
                    'flex flex-col gap-2 rounded-lg border border-border border-l-[3px] bg-card px-3.5 py-3 sm:flex-row sm:items-center sm:gap-4',
                    severity.row,
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <severity.Icon className={cn('mt-0.5 size-4 shrink-0', severity.icon)} aria-hidden />
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-sm font-medium text-foreground">
                        <span className="sr-only">{severity.label}: </span>
                        {alert.title}
                      </p>
                      <p className="text-xs text-muted-foreground">{alert.description}</p>
                      {alert.comparison ? (
                        <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                          <span>{alert.comparison.metric}:</span>
                          <span className="font-financial">
                            {formatCurrencyBr(alert.comparison.previous)}
                          </span>
                          <span aria-hidden>→</span>
                          <span className="font-financial text-foreground">
                            {formatCurrencyBr(alert.comparison.current)}
                          </span>
                          <span className="text-muted-foreground">vs. período anterior</span>
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center justify-between gap-3 pl-7 sm:justify-end sm:pl-0">
                    {change != null ? (
                      <span
                        className={cn(
                          'inline-flex items-center gap-0.5 font-financial text-xs font-semibold',
                          change < 0 ? 'text-destructive' : 'text-success',
                        )}
                      >
                        {change < 0 ? (
                          <ArrowDownRight className="size-3.5" aria-hidden />
                        ) : (
                          <ArrowUpRight className="size-3.5" aria-hidden />
                        )}
                        {formatPercent(Math.abs(change))}
                      </span>
                    ) : null}
                    {href ? (
                      <Link
                        href={href}
                        className="inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
                      >
                        Ver análise
                        <ChevronRight className="size-3.5" aria-hidden />
                      </Link>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export {OperationalAlertsCard};
