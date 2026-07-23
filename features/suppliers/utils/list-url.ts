import {ROUTES} from '@/constants/routes/paths';

import type {SupplierListFilters, SupplierSortOptions} from '../types';

export function buildSuppliersListUrl(options: {
  search?: string;
  page?: number;
  filters?: SupplierListFilters;
  sort?: SupplierSortOptions;
}): string {
  const params = new URLSearchParams();

  if (options.search) params.set('q', options.search);
  if (options.page && options.page > 1) params.set('page', String(options.page));
  if (options.filters?.category) params.set('category', options.filters.category);
  if (options.filters?.city) params.set('city', options.filters.city);
  if (options.filters?.state) params.set('state', options.filters.state);
  if (options.filters?.active === true) params.set('active', '1');
  if (options.filters?.active === false) params.set('active', '0');
  if (options.sort?.sortBy) params.set('sortBy', options.sort.sortBy);
  if (options.sort?.sortOrder) params.set('sortOrder', options.sort.sortOrder);

  const query = params.toString();
  return query ? `${ROUTES.fornecedores}?${query}` : ROUTES.fornecedores;
}
