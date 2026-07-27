import type {OperationalDreFilters} from '@/features/dre/types';
import {toIsoDate} from '@/features/organization/dashboard/utils/period';

import type {CockpitPeriodPreset} from '../types';

export function resolveCockpitPeriod(
  preset: CockpitPeriodPreset,
  now = new Date(),
): OperationalDreFilters {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (preset === 'hoje') {
    return {dateFrom: toIsoDate(today), dateTo: toIsoDate(today)};
  }

  if (preset === 'semana') {
    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    return {dateFrom: toIsoDate(from), dateTo: toIsoDate(today)};
  }

  if (preset === 'ano') {
    const from = new Date(today.getFullYear(), 0, 1);
    return {dateFrom: toIsoDate(from), dateTo: toIsoDate(today)};
  }

  // mês
  const from = new Date(today.getFullYear(), today.getMonth(), 1);
  return {dateFrom: toIsoDate(from), dateTo: toIsoDate(today)};
}

export function parseCockpitPeriodPreset(
  value: string | undefined | null,
): CockpitPeriodPreset {
  if (value === 'hoje' || value === 'semana' || value === 'mes' || value === 'ano') {
    return value;
  }
  return 'mes';
}

/**
 * Mesmo intervalo deslocado 1 ano atrás (quando possível).
 * Retorna null se as datas forem inválidas.
 */
export function yearAgoPeriodFilters(
  filters: OperationalDreFilters,
): OperationalDreFilters | null {
  if (!filters.dateFrom || !filters.dateTo) return null;

  const from = new Date(`${filters.dateFrom}T12:00:00`);
  const to = new Date(`${filters.dateTo}T12:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;

  from.setFullYear(from.getFullYear() - 1);
  to.setFullYear(to.getFullYear() - 1);

  return {
    ...filters,
    dateFrom: toIsoDate(from),
    dateTo: toIsoDate(to),
  };
}

export const COCKPIT_PERIOD_OPTIONS: Array<{
  id: CockpitPeriodPreset;
  label: string;
}> = [
  {id: 'hoje', label: 'Hoje'},
  {id: 'semana', label: 'Semana'},
  {id: 'mes', label: 'Mês'},
  {id: 'ano', label: 'Ano'},
];
