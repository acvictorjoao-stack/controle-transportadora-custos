'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {Section} from '@/components/layout/section';
import {cn} from '@/lib/utils';

import type {ChartPoint, OperationalChartsData} from '../types';

export interface OperationalChartsProps {
  charts: OperationalChartsData;
}

function MiniBarChart({
  title,
  description,
  points,
  suffix = '',
}: {
  title: string;
  description: string;
  points: ChartPoint[];
  suffix?: string;
}) {
  const max = Math.max(1, ...points.map((point) => Math.abs(point.value)));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {points.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem dados no período.</p>
        ) : (
          <div className="space-y-3" role="img" aria-label={title}>
            {points.slice(0, 12).map((point) => {
              const width = Math.max(4, (Math.abs(point.value) / max) * 100);
              return (
                <div key={point.key} className="space-y-1">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-medium">{point.label}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {point.value.toLocaleString('pt-BR')}
                      {suffix}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className={cn('h-2 rounded-full bg-sky-500/80')}
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

function OperationalCharts({charts}: OperationalChartsProps) {
  return (
    <Section title="Gráficos" description="Movimento operacional do recorte.">
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <MiniBarChart
          title="Viagens por hora"
          description="Inícios distribuídos por hora do dia"
          points={charts.tripsByHour}
        />
        <MiniBarChart
          title="SLA diário"
          description="Percentual de entregas no prazo"
          points={charts.dailySla}
          suffix="%"
        />
        <MiniBarChart
          title="Lead Time"
          description="Média diária em minutos"
          points={charts.leadTimeByDay}
          suffix=" min"
        />
        <MiniBarChart
          title="Entregas concluídas"
          description="Volume diário de conclusões"
          points={charts.completedDeliveries}
        />
        <MiniBarChart
          title="Ocorrências por motivo"
          description="Distribuição por tipo"
          points={charts.occurrencesByReason}
        />
      </div>
    </Section>
  );
}

export {OperationalCharts};
