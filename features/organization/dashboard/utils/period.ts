import {parseSharedAnalyticsFilters} from '@/features/analytics-nav/utils/shared-filters';
import type {
  OperationalDreFilterOptions,
  OperationalDreFilters,
} from '@/features/dre/types';

export type ExecutiveDashboardSearchParams = {
  empresa?: string;
  filial?: string;
  cliente?: string;
  rota?: string;
  veiculo?: string;
  motorista?: string;
  centro?: string;
  de?: string;
  ate?: string;
  periodo?: string;
};

/** Data local YYYY-MM-DD. */
export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Período padrão: mês corrente. */
export function currentMonthFilters(): OperationalDreFilters {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    dateFrom: toIsoDate(from),
    dateTo: toIsoDate(to),
  };
}

/**
 * URL vazia → mês corrente (comportamento histórico).
 * Query `de`/`ate`/`periodo` e entidades prevalecem.
 * Não lê `company_id` do cliente.
 */
export function resolveExecutiveDashboardFilters(
  params: ExecutiveDashboardSearchParams = {},
): OperationalDreFilters {
  const parsed = parseSharedAnalyticsFilters(params);
  const fallback = currentMonthFilters();
  return {
    ...parsed,
    dateFrom: parsed.dateFrom ?? fallback.dateFrom,
    dateTo: parsed.dateTo ?? fallback.dateTo,
  };
}

export function formatPeriodRangeLabel(
  filters: Pick<OperationalDreFilters, 'dateFrom' | 'dateTo'>,
): string {
  const from = formatIsoDatePtBr(filters.dateFrom);
  const to = formatIsoDatePtBr(filters.dateTo);
  if (from && to) return `${from} – ${to}`;
  return from || to || '';
}

function formatIsoDatePtBr(iso?: string): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return '';
  const [year, month, day] = iso.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

export function formatEntityFilterSummary(
  filters: OperationalDreFilters,
  options: OperationalDreFilterOptions,
): string {
  const parts: string[] = [];
  const branch = options.branches.find((item) => item.id === filters.branchId);
  const customer = options.customers.find((item) => item.id === filters.customerId);
  const route = options.routes.find((item) => item.id === filters.routeId);
  const vehicle = options.vehicles.find((item) => item.id === filters.vehicleId);
  const driver = options.drivers.find((item) => item.id === filters.driverId);
  const center = options.costCenters.find((item) => item.id === filters.costCenterId);

  if (branch) parts.push(`Filial: ${branch.name}`);
  if (customer) parts.push(`Cliente: ${customer.name}`);
  if (route) {
    parts.push(
      `Rota: ${route.code ? `${route.code} — ${route.name}` : route.name}`,
    );
  }
  if (vehicle) parts.push(`Veículo: ${vehicle.label}`);
  if (driver) parts.push(`Motorista: ${driver.name}`);
  if (center) parts.push(`Centro: ${center.code}`);

  return parts.join(' · ');
}

/**
 * Período imediatamente anterior com a mesma duração.
 * Ex.: 01–31 mar → 01–28/29 fev; 10–20 mar → 24 fev–06 mar.
 */
export function previousPeriodFilters(
  filters: OperationalDreFilters,
): OperationalDreFilters {
  const dateFrom = filters.dateFrom ?? currentMonthFilters().dateFrom!;
  const dateTo = filters.dateTo ?? currentMonthFilters().dateTo!;

  const from = new Date(`${dateFrom}T12:00:00`);
  const to = new Date(`${dateTo}T12:00:00`);
  const durationMs = Math.max(0, to.getTime() - from.getTime());
  const dayMs = 24 * 60 * 60 * 1000;

  const prevTo = new Date(from.getTime() - dayMs);
  const prevFrom = new Date(prevTo.getTime() - durationMs);

  return {
    ...filters,
    dateFrom: toIsoDate(prevFrom),
    dateTo: toIsoDate(prevTo),
  };
}

export interface PeriodBucket {
  key: string;
  label: string;
  filters: OperationalDreFilters;
}

/**
 * Gera até `maxBuckets` meses cobrindo o intervalo (ou últimos N meses).
 */
export function buildMonthlyPeriodBuckets(
  filters: OperationalDreFilters,
  maxBuckets = 6,
): PeriodBucket[] {
  const fallback = currentMonthFilters();
  const dateTo = filters.dateTo ?? fallback.dateTo!;
  const dateFrom = filters.dateFrom ?? (() => {
    const end = new Date(`${dateTo}T12:00:00`);
    const start = new Date(end.getFullYear(), end.getMonth() - (maxBuckets - 1), 1);
    return toIsoDate(start);
  })();

  const start = new Date(`${dateFrom}T12:00:00`);
  const end = new Date(`${dateTo}T12:00:00`);
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  const buckets: PeriodBucket[] = [];

  while (cursor <= last && buckets.length < maxBuckets) {
    const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const from = monthStart < start ? start : monthStart;
    const to = monthEnd > end ? end : monthEnd;

    buckets.push({
      key: `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`,
      label: monthStart.toLocaleDateString('pt-BR', {
        month: 'short',
        year: '2-digit',
      }),
      filters: {
        ...filters,
        dateFrom: toIsoDate(from),
        dateTo: toIsoDate(to),
      },
    });

    cursor.setMonth(cursor.getMonth() + 1);
  }

  return buckets;
}
