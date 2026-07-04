import {ROUTES} from '@/constants/routes/paths';

import type {CustomerListFilters, CustomerSortOptions} from '../types';

export function buildCustomersListUrl(options: {
  search?: string;
  page?: number;
  filters?: CustomerListFilters;
  sort?: CustomerSortOptions;
}): string {
  const params = new URLSearchParams();

  if (options.search) params.set('q', options.search);
  if (options.page && options.page > 1) params.set('page', String(options.page));
  if (options.filters?.customerStatus) params.set('status', options.filters.customerStatus);
  if (options.filters?.segment) params.set('segment', options.filters.segment);
  if (options.filters?.hasActiveContract) params.set('contract', '1');
  if (options.filters?.city) params.set('city', options.filters.city);
  if (options.filters?.state) params.set('state', options.filters.state);
  if (options.filters?.salesRepresentative) params.set('rep', options.filters.salesRepresentative);
  if (options.filters?.branchId) params.set('branch', options.filters.branchId);
  if (options.sort?.sortBy) params.set('sortBy', options.sort.sortBy);
  if (options.sort?.sortOrder) params.set('sortOrder', options.sort.sortOrder);

  const query = params.toString();
  return query ? `${ROUTES.clientes}?${query}` : ROUTES.clientes;
}
