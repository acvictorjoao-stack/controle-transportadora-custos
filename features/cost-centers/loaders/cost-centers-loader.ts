import type {SupabaseClient} from '@supabase/supabase-js';

import {listCostCenters, listCostCentersForSelect} from '../queries';
import type {CostCenterSelectOption, PaginatedCostCenters} from '../types';

/**
 * Loader entry-points — pages should call these instead of composing queries.
 */
export async function getCostCentersPage(
  supabase: SupabaseClient,
  companyId: string,
  options: {search?: string; page?: number; status?: string} = {},
): Promise<PaginatedCostCenters> {
  return listCostCenters(supabase, {
    companyId,
    search: options.search,
    page: options.page,
    status: options.status,
  });
}

export async function getCostCentersForSelect(
  supabase: SupabaseClient,
  companyId: string,
): Promise<CostCenterSelectOption[]> {
  return listCostCentersForSelect(supabase, companyId);
}
