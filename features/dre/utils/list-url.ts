import {ROUTES} from '@/constants/routes/paths';

import type {OperationalDreFilters} from '../types';

const ROLLING_PERIOD_PRESETS: Record<string, number> = {
  '7d': 7,
  '14d': 14,
  '30d': 30,
  '90d': 90,
};

/** Presets nomeados do Dashboard Executivo. `7d`/`14d` permanecem só no atalho DRE. */
export const NAMED_ANALYTICS_PERIOD_PRESETS = [
  {id: 'hoje', label: 'Hoje'},
  {id: 'ontem', label: 'Ontem'},
  {id: 'esta-semana', label: 'Esta semana'},
  {id: 'este-mes', label: 'Este mês'},
  {id: 'mes-anterior', label: 'Mês anterior'},
  {id: '30d', label: 'Últimos 30 dias'},
  {id: '90d', label: 'Últimos 90 dias'},
  {id: 'este-ano', label: 'Este ano'},
] as const;

export type NamedAnalyticsPeriodPresetId =
  (typeof NAMED_ANALYTICS_PERIOD_PRESETS)[number]['id'];

function toUtcIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Data local YYYY-MM-DD — alinhada a `currentMonthFilters`. */
function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfLocalDay(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Intervalo de calendário local para presets nomeados.
 * Não altera a janela UTC rolante de `7d`/`14d`/`30d`/`90d` da DRE.
 */
export function resolveNamedPeriodRange(
  periodo: string,
  now: Date = new Date(),
): Pick<OperationalDreFilters, 'dateFrom' | 'dateTo'> | null {
  const key = periodo.toLowerCase();
  const today = startOfLocalDay(now);

  if (key === 'hoje') {
    const iso = toLocalIsoDate(today);
    return {dateFrom: iso, dateTo: iso};
  }

  if (key === 'ontem') {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const iso = toLocalIsoDate(yesterday);
    return {dateFrom: iso, dateTo: iso};
  }

  if (key === 'esta-semana') {
    const mondayOffset = (today.getDay() + 6) % 7;
    const from = new Date(today);
    from.setDate(from.getDate() - mondayOffset);
    return {dateFrom: toLocalIsoDate(from), dateTo: toLocalIsoDate(today)};
  }

  if (key === 'este-mes') {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    const to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return {dateFrom: toLocalIsoDate(from), dateTo: toLocalIsoDate(to)};
  }

  if (key === 'mes-anterior') {
    const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const to = new Date(today.getFullYear(), today.getMonth(), 0);
    return {dateFrom: toLocalIsoDate(from), dateTo: toLocalIsoDate(to)};
  }

  if (key === 'este-ano') {
    const from = new Date(today.getFullYear(), 0, 1);
    return {dateFrom: toLocalIsoDate(from), dateTo: toLocalIsoDate(today)};
  }

  if (key === '30d' || key === '90d') {
    const days = key === '30d' ? 30 : 90;
    const from = new Date(today);
    from.setDate(from.getDate() - (days - 1));
    return {dateFrom: toLocalIsoDate(from), dateTo: toLocalIsoDate(today)};
  }

  return null;
}

export function matchNamedPeriodPreset(
  filters: Pick<OperationalDreFilters, 'dateFrom' | 'dateTo'>,
  now: Date = new Date(),
): NamedAnalyticsPeriodPresetId | 'personalizado' {
  for (const preset of NAMED_ANALYTICS_PERIOD_PRESETS) {
    const range = resolveNamedPeriodRange(preset.id, now);
    if (
      range &&
      range.dateFrom === filters.dateFrom &&
      range.dateTo === filters.dateTo
    ) {
      return preset.id;
    }
  }
  return 'personalizado';
}

/**
 * Converte atalho `periodo` em intervalo de datas.
 * `7d`/`14d`/`30d`/`90d` mantêm a janela rolante histórica da DRE (UTC).
 * Presets de calendário (`hoje`, `este-mes`, …) usam data local.
 */
export function resolvePeriodPreset(
  periodo?: string,
  now: Date = new Date(),
): Pick<OperationalDreFilters, 'dateFrom' | 'dateTo'> | null {
  if (!periodo) return null;
  const key = periodo.toLowerCase();

  const named = resolveNamedPeriodRange(key, now);
  if (named && !(key in ROLLING_PERIOD_PRESETS)) {
    return named;
  }

  const days = ROLLING_PERIOD_PRESETS[key];
  if (!days) return named;

  const to = new Date(now);
  to.setHours(0, 0, 0, 0);
  const from = new Date(to);
  from.setDate(from.getDate() - (days - 1));

  return {dateFrom: toUtcIsoDate(from), dateTo: toUtcIsoDate(to)};
}

/**
 * Serializa filtros analíticos compartilhados (RC 27.6.0).
 * Contrato: empresa/filial, cliente, rota, veiculo, motorista, centro, de/ate, periodo.
 */
export function buildOperationalDreUrl(
  filters: OperationalDreFilters = {},
  basePath: string = ROUTES.dashboardDre,
  options?: {periodo?: string},
): string {
  const params = new URLSearchParams();

  if (filters.branchId) {
    params.set('empresa', filters.branchId);
    params.set('filial', filters.branchId);
  }
  if (filters.customerId) params.set('cliente', filters.customerId);
  if (filters.routeId) params.set('rota', filters.routeId);
  if (filters.vehicleId) params.set('veiculo', filters.vehicleId);
  if (filters.driverId) params.set('motorista', filters.driverId);
  if (filters.costCenterId) params.set('centro', filters.costCenterId);

  if (options?.periodo) {
    params.set('periodo', options.periodo);
  } else {
    if (filters.dateFrom) params.set('de', filters.dateFrom);
    if (filters.dateTo) params.set('ate', filters.dateTo);
  }

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function parseOperationalDreFilters(params: {
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
}): OperationalDreFilters {
  const period = resolvePeriodPreset(params.periodo);

  return {
    branchId: params.filial || params.empresa || undefined,
    customerId: params.cliente || undefined,
    routeId: params.rota || undefined,
    vehicleId: params.veiculo || undefined,
    driverId: params.motorista || undefined,
    costCenterId: params.centro || undefined,
    dateFrom: period?.dateFrom ?? (params.de || undefined),
    dateTo: period?.dateTo ?? (params.ate || undefined),
  };
}
