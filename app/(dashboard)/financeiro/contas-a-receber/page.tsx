import {redirect} from 'next/navigation';

import {AccountsReceivableList} from '@/features/accounts-receivable/components';
import {
  listAccountsReceivable,
  listAccountsReceivableFilterOptions,
} from '@/features/accounts-receivable/queries';
import type {
  AccountsReceivableCategory,
  AccountsReceivableCostCenter,
  AccountsReceivableListFilters,
  AccountsReceivableSortOptions,
  AccountsReceivableStatus,
  PaginatedAccountsReceivable,
} from '@/features/accounts-receivable/types';
import {
  assertCompanyPermission,
  getCurrentCompanyId,
  getServerSupabaseClient,
} from '@/lib/auth/company';
import {ROUTES} from '@/constants/routes/paths';

interface ContasAReceberPageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
    status?: string;
    category?: string;
    client?: string;
    dueFrom?: string;
    dueTo?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

export default async function ContasAReceberPage({searchParams}: ContasAReceberPageProps) {
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    redirect(ROUTES.login);
  }

  const canRead =
    (await assertCompanyPermission(supabase, companyId, 'financeiro_receber:read')) ||
    (await assertCompanyPermission(supabase, companyId, 'financeiro:read'));

  if (!canRead) {
    redirect(ROUTES.dashboard);
  }

  const params = await searchParams;
  const search = params.q ?? '';
  const page = Number(params.page ?? '1');

  const filters: AccountsReceivableListFilters = {
    entryStatus: params.status as AccountsReceivableStatus | undefined,
    categoryId: params.category,
    client: params.client,
    dueDateFrom: params.dueFrom,
    dueDateTo: params.dueTo,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  };

  const sort: AccountsReceivableSortOptions = {
    sortBy: (params.sortBy as AccountsReceivableSortOptions['sortBy']) ?? 'due_date',
    sortOrder: (params.sortOrder as 'asc' | 'desc') ?? 'asc',
  };

  let data: PaginatedAccountsReceivable;
  let categories: AccountsReceivableCategory[];
  let costCenters: AccountsReceivableCostCenter[];
  let error: string | null = null;

  try {
    const [entries, filterOptions] = await Promise.all([
      listAccountsReceivable(supabase, {companyId, search, page, filters, sort}),
      listAccountsReceivableFilterOptions(supabase, companyId),
    ]);

    data = entries;
    categories = filterOptions.categories;
    costCenters = filterOptions.costCenters;
  } catch (err) {
    error = err instanceof Error ? err.message : 'Erro ao carregar contas a receber.';
    data = {items: [], total: 0, page: 1, pageSize: 10, totalPages: 1};
    categories = [];
    costCenters = [];
  }

  return (
    <AccountsReceivableList
      initialData={data}
      initialSearch={search}
      initialFilters={filters}
      initialSort={sort}
      categories={categories}
      costCenters={costCenters}
      error={error}
    />
  );
}
