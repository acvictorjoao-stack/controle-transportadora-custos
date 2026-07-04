import {ROUTES} from '@/constants/routes/paths';

import type {TireListFilters, TireSortOptions} from '../types';

export interface BuildTiresListUrlParams {
  search?: string;
  page?: number;
  filters?: TireListFilters;
  sort?: TireSortOptions;
}

export function buildTiresListUrl({
  search,
  page,
  filters = {},
  sort = {},
}: BuildTiresListUrlParams): string {
  const params = new URLSearchParams();

  if (search) params.set('q', search);
  if (page && page > 1) params.set('page', String(page));
  if (filters.vehicleId) params.set('vehicle', filters.vehicleId);
  if (filters.branchId) params.set('branch', filters.branchId);
  if (filters.tireStatus) params.set('status', filters.tireStatus);
  if (filters.brand) params.set('brand', filters.brand);
  if (filters.supplier) params.set('supplier', filters.supplier);
  if (filters.position) params.set('position', filters.position);
  if (filters.hasRecap) params.set('recap', 'true');
  if (sort.sortBy) params.set('sortBy', sort.sortBy);
  if (sort.sortOrder) params.set('sortOrder', sort.sortOrder);

  const query = params.toString();
  return query ? `${ROUTES.pneus}?${query}` : ROUTES.pneus;
}
