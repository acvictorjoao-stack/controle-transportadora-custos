import {ROUTES} from '@/constants/routes/paths';

import type {MaintenanceListFilters, MaintenanceSortOptions} from '../types';

export interface BuildMaintenanceListUrlParams {
  search?: string;
  page?: number;
  filters?: MaintenanceListFilters;
  sort?: MaintenanceSortOptions;
}

export function buildMaintenanceListUrl({
  search,
  page,
  filters = {},
  sort = {},
}: BuildMaintenanceListUrlParams): string {
  const params = new URLSearchParams();

  if (search) params.set('q', search);
  if (page && page > 1) params.set('page', String(page));
  if (filters.vehicleId) params.set('vehicle', filters.vehicleId);
  if (filters.driverId) params.set('driver', filters.driverId);
  if (filters.branchId) params.set('branch', filters.branchId);
  if (filters.maintenanceType) params.set('type', filters.maintenanceType);
  if (filters.maintenanceStatus) params.set('status', filters.maintenanceStatus);
  if (filters.supplier) params.set('supplier', filters.supplier);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (sort.sortBy) params.set('sortBy', sort.sortBy);
  if (sort.sortOrder) params.set('sortOrder', sort.sortOrder);

  const query = params.toString();
  return query ? `${ROUTES.manutencoes}?${query}` : ROUTES.manutencoes;
}
