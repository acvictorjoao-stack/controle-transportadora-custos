import {ROUTES} from '@/constants/routes/paths';

import type {FinancialListFilters, FinancialSortOptions} from '../types';

export interface BuildFinancialListUrlParams {
  search?: string;
  page?: number;
  filters?: FinancialListFilters;
  sort?: FinancialSortOptions;
}

export function buildFinancialListUrl({
  search,
  page,
  filters = {},
  sort = {},
}: BuildFinancialListUrlParams): string {
  const params = new URLSearchParams();

  if (search) params.set('q', search);
  if (page && page > 1) params.set('page', String(page));
  if (filters.branchId) params.set('branch', filters.branchId);
  if (filters.vehicleId) params.set('vehicle', filters.vehicleId);
  if (filters.driverId) params.set('driver', filters.driverId);
  if (filters.tripId) params.set('trip', filters.tripId);
  if (filters.categoryId) params.set('category', filters.categoryId);
  if (filters.costCenterId) params.set('costCenter', filters.costCenterId);
  if (filters.entryType) params.set('type', filters.entryType);
  if (filters.entryStatus) params.set('status', filters.entryStatus);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (sort.sortBy) params.set('sortBy', sort.sortBy);
  if (sort.sortOrder) params.set('sortOrder', sort.sortOrder);

  const query = params.toString();
  return query ? `${ROUTES.financeiro}?${query}` : ROUTES.financeiro;
}
