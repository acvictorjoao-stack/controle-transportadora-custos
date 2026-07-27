'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {formatCurrencyBr} from '@/features/financial/utils/financial-format';
import {cn} from '@/lib/utils';

export interface PeriodChartPoint {
  key: string;
  label: string;
  revenue: number;
  costs: number;
  profit: number;
}

export interface RevenueCostProfitChartProps {
  points: PeriodChartPoint[];
  title?: string;
  description?: string;
  className?: string;
}

function RevenueCostProfitChart({
  points,
  title = 'Receita × Custos × Lucro',
  description = 'Evolução por período',
  className,
}: RevenueCostProfitChartProps) {
  const maxValue = Math.max(
    1,
    ...points.flatMap((point) => [
      Math.abs(point.revenue),
      Math.abs(point.costs),
      Math.abs(point.profit),
    ]),
  );

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {points.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sem dados para montar o gráfico no período.
          </p>
        ) : (
          <div className="space-y-4">
            <div
              className="flex h-56 items-end gap-3 overflow-x-auto pb-2"
              role="img"
              aria-label={title}
            >
              {points.map((point) => (
                <div
                  key={point.key}
                  className="flex min-w-[4.5rem] flex-1 flex-col items-center gap-2"
                >
                  <div className="flex h-44 w-full items-end justify-center gap-1">
                    <Bar
                      value={point.revenue}
                      max={maxValue}
                      className="bg-emerald-500/80"
                      label="Receita"
                    />
                    <Bar
                      value={point.costs}
                      max={maxValue}
                      className="bg-amber-500/80"
                      label="Custos"
                    />
                    <Bar
                      value={point.profit}
                      max={maxValue}
                      className={
                        point.profit < 0 ? 'bg-destructive/80' : 'bg-sky-500/80'
                      }
                      label="Lucro"
                    />
                  </div>
                  <span className="text-center text-[11px] text-muted-foreground">
                    {point.label}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <Legend swatch="bg-emerald-500/80" label="Receita" />
              <Legend swatch="bg-amber-500/80" label="Custos" />
              <Legend swatch="bg-sky-500/80" label="Lucro" />
            </div>
            <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
              {points.map((point) => (
                <div key={`legend-${point.key}`} className="rounded-md border p-2">
                  <p className="font-medium text-foreground">{point.label}</p>
                  <p>Receita {formatCurrencyBr(point.revenue)}</p>
                  <p>Custos {formatCurrencyBr(point.costs)}</p>
                  <p>Lucro {formatCurrencyBr(point.profit)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Bar({
  value,
  max,
  className,
  label,
}: {
  value: number;
  max: number;
  className: string;
  label: string;
}) {
  const height = Math.max(4, (Math.abs(value) / max) * 100);
  return (
    <div
      title={`${label}: ${formatCurrencyBr(value)}`}
      className={cn('w-2.5 rounded-t-sm', className)}
      style={{height: `${height}%`}}
    />
  );
}

function Legend({swatch, label}: {swatch: string; label: string}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('size-2.5 rounded-sm', swatch)} />
      {label}
    </span>
  );
}

export {RevenueCostProfitChart};
