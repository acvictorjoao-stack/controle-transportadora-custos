import {ROUTES} from '@/constants/routes/paths';

import type {PayrollListFilters, PayrollSortOptions} from '../types';
import {competenceToMonthInput} from './competence';

export interface BuildPayrollListUrlParams {
  search?: string;
  sourceId?: string;
  page?: number;
  filters?: PayrollListFilters;
  sort?: PayrollSortOptions;
}

export function buildPayrollListUrl({
  search,
  sourceId,
  page,
  filters = {},
  sort = {},
}: BuildPayrollListUrlParams): string {
  const params = new URLSearchParams();

  if (search) params.set('q', search);
  if (sourceId) params.set('sourceId', sourceId);
  if (page && page > 1) params.set('page', String(page));

  const competence = competenceToMonthInput(filters.competence);
  if (competence) params.set('competencia', competence);
  if (filters.personId) params.set('pessoa', filters.personId);
  if (filters.positionId) params.set('cargo', filters.positionId);
  if (filters.costCenterId) params.set('centro', filters.costCenterId);
  if (filters.expenseType) params.set('tipo', filters.expenseType);
  if (filters.expenseStatus) params.set('status', filters.expenseStatus);
  if (sort.sortBy) params.set('sortBy', sort.sortBy);
  if (sort.sortOrder) params.set('sortOrder', sort.sortOrder);

  const query = params.toString();
  return query ? `${ROUTES.despesasDePessoal}?${query}` : ROUTES.despesasDePessoal;
}
