import {redirect} from 'next/navigation';

import {ROUTES} from '@/constants/routes/paths';
import {PayrollList} from '@/features/payroll/components';
import {getPayrollPage} from '@/features/payroll/loaders';
import type {PayrollPageData} from '@/features/payroll/loaders';
import type {
  PayrollExpenseStatus,
  PayrollExpenseType,
  PayrollListFilters,
  PayrollSortOptions,
} from '@/features/payroll/types';
import {
  assertCompanyPermission,
  getCurrentCompanyId,
  getServerSupabaseClient,
} from '@/lib/auth/company';

interface DespesasDePessoalPageProps {
  searchParams: Promise<{
    q?: string;
    sourceId?: string;
    page?: string;
    competencia?: string;
    pessoa?: string;
    cargo?: string;
    centro?: string;
    tipo?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

const EMPTY_PAGE: PayrollPageData = {
  expenses: {items: [], total: 0, page: 1, pageSize: 10, totalPages: 1},
  summary: {totalCompetence: 0, totalPaid: 0, totalPending: 0, peopleCount: 0},
  people: [],
  positions: [],
  costCenters: [],
};

export default async function DespesasDePessoalPage({
  searchParams,
}: DespesasDePessoalPageProps) {
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    redirect(ROUTES.login);
  }

  const canRead = await assertCompanyPermission(supabase, companyId, 'financeiro:read');
  if (!canRead) {
    redirect(ROUTES.dashboard);
  }

  const params = await searchParams;
  const search = params.q ?? '';
  const sourceId = params.sourceId;
  const page = Number(params.page ?? '1');

  const filters: PayrollListFilters = {
    competence: params.competencia,
    personId: params.pessoa,
    positionId: params.cargo,
    costCenterId: params.centro,
    expenseType: params.tipo as PayrollExpenseType | undefined,
    expenseStatus: params.status as PayrollExpenseStatus | undefined,
  };

  const sort: PayrollSortOptions = {
    sortBy: (params.sortBy as PayrollSortOptions['sortBy']) ?? 'competence',
    sortOrder: (params.sortOrder as 'asc' | 'desc') ?? 'desc',
  };

  let data = EMPTY_PAGE;
  let error: string | null = null;

  try {
    data = await getPayrollPage(supabase, companyId, {search, sourceId, page, filters, sort});
  } catch (err) {
    error =
      err instanceof Error ? err.message : 'Erro ao carregar despesas de pessoal.';
  }

  return (
    <PayrollList
      initialData={data.expenses}
      highlightedExpenseId={sourceId ?? null}
      summary={data.summary}
      people={data.people}
      positions={data.positions}
      costCenters={data.costCenters}
      initialSearch={search}
      initialFilters={filters}
      initialSort={sort}
      error={error}
    />
  );
}
