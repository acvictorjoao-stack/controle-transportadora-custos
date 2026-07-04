import {ROUTES} from '@/constants/routes/paths';

import type {FuelListFilters, FuelSortOptions} from '../types';

export interface BuildFuelListUrlParams {
  search?: string;
  page?: number;
  filters?: FuelListFilters;
  sort?: FuelSortOptions;
}

export function buildFuelListUrl({
  search,
  page,
  filters = {},
  sort = {},
}: BuildFuelListUrlParams): string {
  const params = new URLSearchParams();

  if (search) params.set('q', search);
  if (page && page > 1) params.set('page', String(page));
  if (filters.vehicleId) params.set('vehicle', filters.vehicleId);
  if (filters.driverId) params.set('driver', filters.driverId);
  if (filters.branchId) params.set('branch', filters.branchId);
  if (filters.fuelType) params.set('fuelType', filters.fuelType);
  if (filters.city) params.set('city', filters.city);
  if (filters.stationName) params.set('station', filters.stationName);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.inconsistentOnly) params.set('inconsistent', '1');
  if (sort.sortBy) params.set('sortBy', sort.sortBy);
  if (sort.sortOrder) params.set('sortOrder', sort.sortOrder);

  const query = params.toString();
  return query ? `${ROUTES.abastecimentos}?${query}` : ROUTES.abastecimentos;
}
