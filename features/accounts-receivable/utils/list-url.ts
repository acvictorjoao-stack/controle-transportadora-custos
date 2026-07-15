import {ROUTES} from '@/constants/routes/paths';

import type {AccountsReceivableListFilters, AccountsReceivableSortOptions} from '../types';

export interface BuildAccountsReceivableListUrlParams {
  search?: string;
  page?: number;
  filters?: AccountsReceivableListFilters;
  sort?: AccountsReceivableSortOptions;
}

export function buildAccountsReceivableListUrl({
  search,
  page,
  filters = {},
  sort = {},
}: BuildAccountsReceivableListUrlParams): string {
  const params = new URLSearchParams();

  if (search) params.set('q', search);
  if (page && page > 1) params.set('page', String(page));
  if (filters.entryStatus) params.set('status', filters.entryStatus);
  if (filters.categoryId) params.set('category', filters.categoryId);
  if (filters.client) params.set('client', filters.client);
  if (filters.dueDateFrom) params.set('dueFrom', filters.dueDateFrom);
  if (filters.dueDateTo) params.set('dueTo', filters.dueDateTo);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (sort.sortBy) params.set('sortBy', sort.sortBy);
  if (sort.sortOrder) params.set('sortOrder', sort.sortOrder);

  const query = params.toString();
  return query ? `${ROUTES.contasAReceber}?${query}` : ROUTES.contasAReceber;
}
