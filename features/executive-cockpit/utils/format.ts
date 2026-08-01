import {
  formatCurrencyBr,
  formatPercent,
} from '@/features/financial/utils/financial-format';

import type {ExecutiveGoalMetric} from '../types';
import {EXECUTIVE_GOAL_UNITS} from '../types';

export function formatGoalValue(
  metric: ExecutiveGoalMetric,
  value: number | null | undefined,
): string {
  if (value == null || !Number.isFinite(value)) return '—';

  const unit = EXECUTIVE_GOAL_UNITS[metric];
  if (unit === 'currency' || unit === 'perKm') {
    return formatCurrencyBr(value);
  }
  if (unit === 'percent') {
    return formatPercent(value);
  }
  if (metric === 'leadTime') {
    const days = value / 1440;
    const rounded = Math.round(days * 10) / 10;
    const label = rounded === 1 ? 'dia' : 'dias';
    return `${rounded.toLocaleString('pt-BR')} ${label}`;
  }
  return `${Math.round(value).toLocaleString('pt-BR')} min`;
}

export function percentChange(
  current: number | null | undefined,
  previous: number | null | undefined,
): number | null {
  if (
    current == null ||
    previous == null ||
    !Number.isFinite(current) ||
    !Number.isFinite(previous)
  ) {
    return null;
  }
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function formatCompactDelta(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const rounded = Math.round(value);
  if (rounded === 0) return '0%';
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded}%`;
}
