import {ROUTES} from '@/constants/routes/paths';

import type {OperationalDreFilters} from '../types';

const PERIOD_PRESETS: Record<string, number> = {
  '7d': 7,
  '14d': 14,
  '30d': 30,
  '90d': 90,
};

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Converte atalho `periodo=30d` em intervalo de datas (fim = hoje). */
export function resolvePeriodPreset(
  periodo?: string,
): Pick<OperationalDreFilters, 'dateFrom' | 'dateTo'> | null {
  if (!periodo) return null;
  const days = PERIOD_PRESETS[periodo.toLowerCase()];
  if (!days) return null;

  const to = new Date();
  to.setHours(0, 0, 0, 0);
  const from = new Date(to);
  from.setDate(from.getDate() - (days - 1));

  return {dateFrom: toIsoDate(from), dateTo: toIsoDate(to)};
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
