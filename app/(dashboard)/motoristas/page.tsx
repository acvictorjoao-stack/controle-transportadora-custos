import {redirect} from 'next/navigation';

import {listBranchesForSelect} from '@/features/organization/branches/queries';
import {DriversList} from '@/features/drivers/components';
import {listDrivers} from '@/features/drivers/queries';
import type {BranchSelectOption} from '@/features/organization/branches/types';
import type {
  DriverContractType,
  DriverLicenseCategory,
  DriverListFilters,
  DriverOperationalStatus,
  DriverSortOptions,
} from '@/features/drivers/types';
import {
  assertCompanyPermission,
  getCurrentCompanyId,
  getServerSupabaseClient,
} from '@/lib/auth/company';
import {ROUTES} from '@/constants/routes/paths';

interface MotoristasPageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
    status?: string;
    branch?: string;
    category?: string;
    contract?: string;
    cnhExpiring?: string;
    cnhExpired?: string;
    earPending?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

export default async function MotoristasPage({searchParams}: MotoristasPageProps) {
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    redirect(ROUTES.login);
  }

  const canRead = await assertCompanyPermission(supabase, companyId, 'drivers:read');
  if (!canRead) {
    redirect(ROUTES.dashboard);
  }

  const params = await searchParams;
  const search = params.q ?? '';
  const page = Number(params.page ?? '1');

  const filters: DriverListFilters = {
    operationalStatus: params.status as DriverOperationalStatus | undefined,
    branchId: params.branch,
    licenseCategory: params.category as DriverLicenseCategory | undefined,
    contractType: params.contract as DriverContractType | undefined,
    cnhExpiring: params.cnhExpiring === '1',
    cnhExpired: params.cnhExpired === '1',
    earPending: params.earPending === '1',
  };

  const sort: DriverSortOptions = {
    sortBy: (params.sortBy as DriverSortOptions['sortBy']) ?? 'name',
    sortOrder: (params.sortOrder as 'asc' | 'desc') ?? 'asc',
  };

  let data;
  let branches: BranchSelectOption[];
  let error: string | null = null;

  try {
    [data, branches] = await Promise.all([
      listDrivers(supabase, {companyId, search, page, filters, sort}),
      listBranchesForSelect(supabase, companyId),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Erro ao carregar motoristas.';
    data = {items: [], total: 0, page: 1, pageSize: 10, totalPages: 1};
    branches = [];
  }

  return (
    <DriversList
      initialData={data}
      initialSearch={search}
      initialFilters={filters}
      initialSort={sort}
      branches={branches}
      error={error}
    />
  );
}
