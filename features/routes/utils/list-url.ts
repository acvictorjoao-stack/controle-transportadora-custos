import {ROUTES} from '@/constants/routes/paths';

import type {RouteListFilters, RouteSortOptions} from '../types';

export interface RoutesListUrlParams {
  search?: string;
  page?: number;
  filters?: RouteListFilters;
  sort?: RouteSortOptions;
}

export function buildRoutesListUrl({
  search = '',
  page = 1,
  filters = {},
  sort = {},
}: RoutesListUrlParams): string {
  const params = new URLSearchParams();

  if (search.trim()) params.set('q', search.trim());
  if (page > 1) params.set('page', String(page));
  if (filters.operationalStatus) params.set('status', filters.operationalStatus);
  if (filters.routeType) params.set('type', filters.routeType);
  if (filters.origin) params.set('origin', filters.origin);
  if (filters.destination) params.set('destination', filters.destination);
  if (sort.sortBy && sort.sortBy !== 'name') params.set('sortBy', sort.sortBy);
  if (sort.sortOrder && sort.sortOrder !== 'asc') {
    params.set('sortOrder', sort.sortOrder);
  }

  const query = params.toString();
  return query ? `${ROUTES.rotas}?${query}` : ROUTES.rotas;
}
