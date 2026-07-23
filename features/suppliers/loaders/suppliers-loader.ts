import type {SupabaseClient} from '@supabase/supabase-js';

import {
  getSupplierById,
  getSupplierStats,
  listSupplierRecentFinancial,
  listSuppliers,
  listSuppliersForSelect,
} from '../queries';
import type {
  PaginatedSuppliers,
  SupplierDetailData,
  SupplierListFilters,
  SupplierSelectOption,
  SupplierSortOptions,
} from '../types';
import {emptySupplierStats} from '../services/mappers';

/** Loader compartilhado — listagem paginada (evita consultas duplicadas nas pages). */
export async function getSuppliersPage(
  supabase: SupabaseClient,
  companyId: string,
  options: {
    search?: string;
    page?: number;
    filters?: SupplierListFilters;
    sort?: SupplierSortOptions;
  },
): Promise<PaginatedSuppliers> {
  return listSuppliers(supabase, {companyId, ...options});
}

/** Loader compartilhado — opções para selects (autocomplete). */
export async function getSuppliersForSelect(
  supabase: SupabaseClient,
  companyId: string,
  options?: {includeInactive?: boolean; search?: string; limit?: number},
): Promise<SupplierSelectOption[]> {
  return listSuppliersForSelect(supabase, companyId, options);
}

export async function composeSupplierDetail(
  supabase: SupabaseClient,
  companyId: string,
  supplierId: string,
): Promise<SupplierDetailData | null> {
  const supplier = await getSupplierById(supabase, companyId, supplierId);
  if (!supplier) return null;

  const [stats, recentFinancial] = await Promise.all([
    getSupplierStats(supabase, companyId, supplierId).catch(() => emptySupplierStats()),
    listSupplierRecentFinancial(supabase, companyId, supplierId).catch(() => []),
  ]);

  return {supplier, stats, recentFinancial};
}
