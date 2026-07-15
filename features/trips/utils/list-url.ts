import {ROUTES} from '@/constants/routes/paths';

import type {TripListFilters, TripSortOptions} from '../types';

export interface TripsListUrlParams {
  search?: string;
  page?: number;
  filters?: TripListFilters;
  sort?: TripSortOptions;
}

export function buildTripsListUrl({
  search = '',
  page = 1,
  filters = {},
  sort = {},
}: TripsListUrlParams): string {
  const params = new URLSearchParams();

  if (search.trim()) params.set('q', search.trim());
  if (page > 1) params.set('page', String(page));
  if (filters.tripStatus) params.set('status', filters.tripStatus);
  if (filters.driverId) params.set('driver', filters.driverId);
  if (filters.vehicleId) params.set('vehicle', filters.vehicleId);
  if (filters.clientName) params.set('client', filters.clientName);
  if (filters.branchId) params.set('branch', filters.branchId);
  if (filters.routeId) params.set('route', filters.routeId);
  if (filters.origin) params.set('origin', filters.origin);
  if (filters.destination) params.set('destination', filters.destination);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (sort.sortBy && sort.sortBy !== 'departed_at') params.set('sortBy', sort.sortBy);
  if (sort.sortOrder && sort.sortOrder !== 'desc') {
    params.set('sortOrder', sort.sortOrder);
  }

  const query = params.toString();
  return query ? `${ROUTES.viagens}?${query}` : ROUTES.viagens;
}
