import {ROUTES} from '@/constants/routes/paths';

import type {VehicleListFilters, VehicleSortOptions} from '../types';

export interface VehiclesListUrlParams {
  search?: string;
  page?: number;
  filters?: VehicleListFilters;
  sort?: VehicleSortOptions;
}

export function buildVehiclesListUrl({
  search = '',
  page = 1,
  filters = {},
  sort = {},
}: VehiclesListUrlParams): string {
  const params = new URLSearchParams();

  if (search.trim()) params.set('q', search.trim());
  if (page > 1) params.set('page', String(page));
  if (filters.plate) params.set('plate', filters.plate);
  if (filters.assetStatus) params.set('status', filters.assetStatus);
  if (filters.branchId) params.set('branch', filters.branchId);
  if (filters.vehicleType) params.set('type', filters.vehicleType);
  if (filters.brand) params.set('brand', filters.brand);
  if (sort.sortBy && sort.sortBy !== 'plate') params.set('sortBy', sort.sortBy);
  if (sort.sortOrder && sort.sortOrder !== 'asc') {
    params.set('sortOrder', sort.sortOrder);
  }

  const query = params.toString();
  return query ? `${ROUTES.veiculos}?${query}` : ROUTES.veiculos;
}
