import {ROUTES} from '@/constants/routes/paths';

import type {DriverListFilters, DriverSortOptions} from '../types';

export interface DriversListUrlParams {
  search?: string;
  page?: number;
  filters?: DriverListFilters;
  sort?: DriverSortOptions;
}

export function buildDriversListUrl({
  search = '',
  page = 1,
  filters = {},
  sort = {},
}: DriversListUrlParams): string {
  const params = new URLSearchParams();

  if (search.trim()) params.set('q', search.trim());
  if (page > 1) params.set('page', String(page));
  if (filters.operationalStatus) params.set('status', filters.operationalStatus);
  if (filters.branchId) params.set('branch', filters.branchId);
  if (filters.licenseCategory) params.set('category', filters.licenseCategory);
  if (filters.contractType) params.set('contract', filters.contractType);
  if (filters.cnhExpiring) params.set('cnhExpiring', '1');
  if (filters.cnhExpired) params.set('cnhExpired', '1');
  if (filters.earPending) params.set('earPending', '1');
  if (sort.sortBy && sort.sortBy !== 'name') params.set('sortBy', sort.sortBy);
  if (sort.sortOrder && sort.sortOrder !== 'asc') {
    params.set('sortOrder', sort.sortOrder);
  }

  const query = params.toString();
  return query ? `${ROUTES.motoristas}?${query}` : ROUTES.motoristas;
}
