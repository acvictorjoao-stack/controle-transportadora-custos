import {cn} from '@/lib/utils';

import type {FavoriteChartPoint} from '../types';
import {formatCompactDelta} from '../utils/format';

export interface FavoriteChartsProps {
  charts: FavoriteChartPoint[];
  className?: string;
}

function FavoriteCharts({charts, className}: FavoriteChartsProps) {
  if (charts.length === 0) return null;

  const max = Math.max(
    ...charts.map((chart) => Math.abs(chart.current ?? 0)),
    1,
  );

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-5 shadow-card',
        className,
      )}
    >
      <h3 className="text-base font-semibold">Gráficos favoritos</h3>
      <p className="text-sm text-muted-foreground">
        Comparativo visual do período atual vs anterior.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {charts.map((chart) => {
          const width = Math.max(
            4,
            Math.round((Math.abs(chart.current ?? 0) / max) * 100),
          );
          const delta = chart.deltaPercent;
          const positive = delta != null && delta >= 0;

          return (
            <div key={chart.id} className="space-y-2">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium">{chart.label}</span>
                <span className="font-financial">{chart.formattedCurrent}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary/80"
                  style={{width: `${width}%`}}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {formatCompactDelta(delta)} vs período anterior
                {delta == null ? (
                  <span> — Comparativo indisponível</span>
                ) : (
                  <span className={positive ? ' text-success' : ' text-destructive'}>
                    {positive ? ' ↑' : ' ↓'}
                  </span>
                )}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export {FavoriteCharts};
