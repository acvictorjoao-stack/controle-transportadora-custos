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

export interface DimensionBarChartPoint {
  key: string;
  label: string;
  value: number;
}

export interface DimensionBarChartProps {
  points: DimensionBarChartPoint[];
  title: string;
  description?: string;
  className?: string;
  emptyMessage?: string;
  valueLabel?: string;
}

function DimensionBarChart({
  points,
  title,
  description,
  className,
  emptyMessage = 'Sem dados para montar o gráfico no período.',
  valueLabel = 'Valor',
}: DimensionBarChartProps) {
  const maxValue = Math.max(1, ...points.map((point) => Math.abs(point.value)));

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        {points.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <div className="space-y-3" role="img" aria-label={title}>
            {points.map((point) => {
              const width = Math.max(4, (Math.abs(point.value) / maxValue) * 100);
              const negative = point.value < 0;
              return (
                <div key={point.key} className="space-y-1">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-medium">{point.label}</span>
                    <span
                      className={cn(
                        'shrink-0 font-financial text-xs',
                        negative ? 'text-destructive' : 'text-muted-foreground',
                      )}
                    >
                      {formatCurrencyBr(point.value)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      title={`${valueLabel}: ${formatCurrencyBr(point.value)}`}
                      className={cn(
                        'h-2 rounded-full',
                        negative ? 'bg-destructive/80' : 'bg-sky-500/80',
                      )}
                      style={{width: `${width}%`}}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export {DimensionBarChart};
