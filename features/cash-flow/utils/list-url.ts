import {ROUTES} from '@/constants/routes/paths';

import type {CashFlowListFilters} from '../types';

export interface BuildCashFlowListUrlParams {
  search?: string;
  page?: number;
  filters?: CashFlowListFilters;
}

export function buildCashFlowListUrl({
  search,
  page,
  filters = {},
}: BuildCashFlowListUrlParams): string {
  const params = new URLSearchParams();

  if (search) params.set('q', search);
  if (page && page > 1) params.set('page', String(page));
  if (filters.cashFlowType) params.set('type', filters.cashFlowType);
  if (filters.entryStatus) params.set('status', filters.entryStatus);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);

  const query = params.toString();
  return query ? `${ROUTES.fluxoDeCaixa}?${query}` : ROUTES.fluxoDeCaixa;
}
