import type {SupabaseClient} from '@supabase/supabase-js';

import {getCostCentersForSelect} from '@/features/cost-centers/loaders';
import type {CostCenterSelectOption} from '@/features/cost-centers/types';

import {
  getPayrollSummary,
  listPayrollExpenses,
  listPayrollPeople,
  listPositions,
} from '../queries';
import type {
  PaginatedPayrollExpenses,
  PayrollListFilters,
  PayrollPersonOption,
  PayrollSortOptions,
  PayrollSummary,
  Position,
} from '../types';

export interface PayrollPageData {
  expenses: PaginatedPayrollExpenses;
  summary: PayrollSummary;
  people: PayrollPersonOption[];
  positions: Position[];
  costCenters: CostCenterSelectOption[];
}

export interface GetPayrollPageOptions {
  search?: string;
  sourceId?: string;
  page?: number;
  filters?: PayrollListFilters;
  sort?: PayrollSortOptions;
}

/**
 * Composição da página de Despesas de Pessoal.
 * O resumo respeita os mesmos filtros da listagem (inclusive competência).
 */
export async function getPayrollPage(
  supabase: SupabaseClient,
  companyId: string,
  options: GetPayrollPageOptions = {},
): Promise<PayrollPageData> {
  const [expenses, summary, people, positions, costCenters] = await Promise.all([
    listPayrollExpenses(supabase, {
      companyId,
      search: options.search,
      sourceId: options.sourceId,
      page: options.page,
      filters: options.filters,
      sort: options.sort,
    }),
    getPayrollSummary(supabase, companyId, options.filters ?? {}),
    listPayrollPeople(supabase, companyId),
    listPositions(supabase, companyId),
    getCostCentersForSelect(supabase, companyId),
  ]);

  return {expenses, summary, people, positions, costCenters};
}
