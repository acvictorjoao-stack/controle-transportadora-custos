import {redirect} from 'next/navigation';

import {CustomersList} from '@/features/customers/components';
import {listCustomers} from '@/features/customers/queries';
import type {
  CustomerListFilters,
  CustomerSegment,
  CustomerSortOptions,
  CustomerStatus,
} from '@/features/customers/types';
import {listBranchesForSelect} from '@/features/organization/branches/queries';
import type {BranchSelectOption} from '@/features/organization/branches/types';
import type {PaginatedCustomers} from '@/features/customers/types';
import {
  assertCompanyPermission,
  getCurrentCompanyId,
  getServerSupabaseClient,
} from '@/lib/auth/company';
import {ROUTES} from '@/constants/routes/paths';

interface ClientesPageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
    status?: string;
    segment?: string;
    contract?: string;
    city?: string;
    state?: string;
    rep?: string;
    branch?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

export default async function ClientesPage({searchParams}: ClientesPageProps) {
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    redirect(ROUTES.login);
  }

  const canRead = await assertCompanyPermission(supabase, companyId, 'customers:read');
  if (!canRead) {
    redirect(ROUTES.dashboard);
  }

  const params = await searchParams;
  const search = params.q ?? '';
  const page = Number(params.page ?? '1');

  const filters: CustomerListFilters = {
    customerStatus: params.status as CustomerStatus | undefined,
    segment: params.segment as CustomerSegment | undefined,
    hasActiveContract: params.contract === '1',
    city: params.city,
    state: params.state,
    salesRepresentative: params.rep,
    branchId: params.branch,
  };

  const sort: CustomerSortOptions = {
    sortBy: (params.sortBy as CustomerSortOptions['sortBy']) ?? 'legal_name',
    sortOrder: (params.sortOrder as 'asc' | 'desc') ?? 'asc',
  };

  let data: PaginatedCustomers;
  let branches: BranchSelectOption[];
  let error: string | null = null;

  try {
    [data, branches] = await Promise.all([
      listCustomers(supabase, {companyId, search, page, filters, sort}),
      listBranchesForSelect(supabase, companyId),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Erro ao carregar clientes.';
    data = {items: [], total: 0, page: 1, pageSize: 10, totalPages: 1};
    branches = [];
  }

  return (
    <CustomersList
      initialData={data}
      initialSearch={search}
      initialFilters={filters}
      initialSort={sort}
      branches={branches}
      error={error}
    />
  );
}
