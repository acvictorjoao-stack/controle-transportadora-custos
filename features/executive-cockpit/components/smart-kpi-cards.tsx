import {Badge} from '@/components/ui/badge';
import {cn} from '@/lib/utils';

import type {SmartKpiCard} from '../types';
import {formatCompactDelta} from '../utils/format';

export interface SmartKpiCardsProps {
  kpis: SmartKpiCard[];
  className?: string;
}

function badgeVariant(status: SmartKpiCard['status']) {
  if (status === 'acima') return 'success' as const;
  if (status === 'atencao') return 'warning' as const;
  if (status === 'indefinido') return 'outline' as const;
  return 'destructive' as const;
}

function SmartKpiCards({kpis, className}: SmartKpiCardsProps) {
  const hasAnyValue = kpis.some((kpi) => kpi.value != null);

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {!hasAnyValue && (
        <p className="text-sm text-muted-foreground">
          Sem dados para o período selecionado.
        </p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map((kpi) => (
          <div
            key={kpi.id}
            className="rounded-xl border border-border bg-card p-5 shadow-card"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {kpi.label}
              </p>
              <span className="text-base" aria-hidden>
                {kpi.emoji}
              </span>
            </div>
            <p
              className="mt-2 font-financial text-2xl font-semibold tracking-tight"
              data-financial="true"
            >
              {kpi.formattedValue}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant={badgeVariant(kpi.status)}>{kpi.statusLabel}</Badge>
              <span className="text-xs text-muted-foreground">
                {kpi.deltaVsPrevious == null
                  ? 'Comparativo indisponível'
                  : `${formatCompactDelta(kpi.deltaVsPrevious)} vs ant.`}
              </span>
            </div>
            {kpi.progressPercent != null && (
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>Meta</span>
                  <span>{kpi.progressPercent}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      kpi.status === 'acima' && 'bg-success',
                      kpi.status === 'atencao' && 'bg-warning',
                      kpi.status === 'abaixo' && 'bg-destructive',
                    )}
                    style={{width: `${Math.min(100, kpi.progressPercent)}%`}}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export {SmartKpiCards};
