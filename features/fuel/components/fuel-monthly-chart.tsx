'use client';

import * as React from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import type {MonthlyConsumptionPoint} from '../types';
import {formatCurrencyBr, formatKmPerLiter, formatLiters} from '../utils/fuel-format';
import {FUEL_NATIVE_SELECT_CLASS} from '../utils/form-styles';

export interface FuelMonthlyChartProps {
  data: MonthlyConsumptionPoint[];
}

type Indicator = 'distanceKm' | 'liters' | 'fuelCost' | 'kmPerLiter';

const INDICATOR_OPTIONS: {value: Indicator; label: string}[] = [
  {value: 'distanceKm', label: 'Distância'},
  {value: 'liters', label: 'Litros'},
  {value: 'fuelCost', label: 'Custo'},
  {value: 'kmPerLiter', label: 'km/L'},
];

/** Reads the raw value for an indicator, treating a `null` km/L point (no liters that month) as zero — display only, never a domain calculation. */
function readIndicatorValue(point: MonthlyConsumptionPoint, indicator: Indicator): number {
  return point[indicator] ?? 0;
}

function formatIndicatorValue(indicator: Indicator, value: number | null): string {
  if (indicator === 'distanceKm') return `${(value ?? 0).toLocaleString('pt-BR', {maximumFractionDigits: 1})} km`;
  if (indicator === 'liters') return formatLiters(value ?? 0);
  if (indicator === 'kmPerLiter') return formatKmPerLiter(value);
  return formatCurrencyBr(value ?? 0);
}

function formatMonthLabel(month: string): string {
  const [year, monthNumber] = month.split('-');
  if (!year || !monthNumber) return month;
  const date = new Date(Number(year), Number(monthNumber) - 1, 1);
  return date.toLocaleDateString('pt-BR', {month: 'short', year: '2-digit'});
}

/**
 * Monthly consumption chart. Renders exactly the points returned by
 * `getMonthlyConsumptionSeries` — the only computation performed here is
 * the display-only bar-height scale (`value / max`), never a domain metric.
 */
function FuelMonthlyChart({data}: FuelMonthlyChartProps) {
  const [indicator, setIndicator] = React.useState<Indicator>('distanceKm');

  const maxValue = React.useMemo(
    () => Math.max(1, ...data.map((point) => readIndicatorValue(point, indicator))),
    [data, indicator],
  );

  return (
    <Card className="gap-4">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Consumo mensal</CardTitle>
          <CardDescription>Série mensal vinda do Consumption Summary</CardDescription>
        </div>
        <select
          value={indicator}
          onChange={(e) => setIndicator(e.target.value as Indicator)}
          className={FUEL_NATIVE_SELECT_CLASS}
          aria-label="Indicador do gráfico"
        >
          {INDICATOR_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Nenhum período mensal processado.
          </p>
        ) : (
          <div className="flex h-60 items-end justify-between gap-2 rounded-lg border border-border bg-muted/30 p-4">
            {data.map((point) => {
              const chartValue = readIndicatorValue(point, indicator);
              const heightPercent = (chartValue / maxValue) * 100;

              return (
                <div key={point.month} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-full w-full items-end">
                    <div
                      className="w-full rounded-sm bg-primary/70 transition-all"
                      style={{height: `${Math.max(2, heightPercent)}%`}}
                      title={formatIndicatorValue(indicator, point[indicator])}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{formatMonthLabel(point.month)}</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export {FuelMonthlyChart};
