import {ROUTES} from '@/constants/routes/paths';

import type {OperationalDreFilters} from '../types';

export function buildOperationalDreUrl(filters: OperationalDreFilters = {}): string {
  const params = new URLSearchParams();

  if (filters.branchId) params.set('empresa', filters.branchId);
  if (filters.customerId) params.set('cliente', filters.customerId);
  if (filters.routeId) params.set('rota', filters.routeId);
  if (filters.costCenterId) params.set('centro', filters.costCenterId);
  if (filters.dateFrom) params.set('de', filters.dateFrom);
  if (filters.dateTo) params.set('ate', filters.dateTo);

  const query = params.toString();
  return query ? `${ROUTES.dashboard}?${query}` : ROUTES.dashboard;
}

export function parseOperationalDreFilters(params: {
  empresa?: string;
  cliente?: string;
  rota?: string;
  centro?: string;
  de?: string;
  ate?: string;
}): OperationalDreFilters {
  return {
    branchId: params.empresa || undefined,
    customerId: params.cliente || undefined,
    routeId: params.rota || undefined,
    costCenterId: params.centro || undefined,
    dateFrom: params.de || undefined,
    dateTo: params.ate || undefined,
  };
}
