import {redirect} from 'next/navigation';

import {getCostCentersForSelect} from '@/features/cost-centers/loaders';
import type {CostCenterSelectOption} from '@/features/cost-centers/types';
import {EmployeesList} from '@/features/payroll/components/employees-list';
import {getEmployeesPage} from '@/features/payroll/loaders';
import {listPositions} from '@/features/payroll/queries';
import type {PaginatedEmployees, Position} from '@/features/payroll/types';
import {listBranchesForSelect} from '@/features/organization/branches/queries';
import type {BranchSelectOption} from '@/features/organization/branches/types';
import {
  assertCompanyPermission,
  getCurrentCompanyId,
  getServerSupabaseClient,
} from '@/lib/auth/company';
import {ROUTES} from '@/constants/routes/paths';

interface FuncionariosPageProps {
  searchParams: Promise<{q?: string; page?: string}>;
}

export default async function FuncionariosPage({searchParams}: FuncionariosPageProps) {
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
  const page = Number(params.page ?? '1');

  let data: PaginatedEmployees;
  let error: string | null = null;
  let positions: Position[] = [];
  let costCenters: CostCenterSelectOption[] = [];
  let branches: BranchSelectOption[] = [];

  try {
    [data, positions, costCenters, branches] = await Promise.all([
      getEmployeesPage(supabase, companyId, {search, page}),
      listPositions(supabase, companyId),
      getCostCentersForSelect(supabase, companyId),
      listBranchesForSelect(supabase, companyId),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Erro ao carregar funcionários.';
    data = {items: [], total: 0, page: 1, pageSize: 10, totalPages: 1};
  }

  return (
    <EmployeesList
      initialData={data}
      positions={positions}
      costCenters={costCenters}
      branches={branches}
      initialSearch={search}
      error={error}
    />
  );
}
