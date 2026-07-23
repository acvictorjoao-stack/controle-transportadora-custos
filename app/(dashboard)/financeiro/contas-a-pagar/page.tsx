import {redirect} from 'next/navigation';

import {AccountsPayableList} from '@/features/accounts-payable/components';
import {
  listAccountsPayable,
  listAccountsPayableFilterOptions,
} from '@/features/accounts-payable/queries';
import type {
  AccountsPayableCategory,
  AccountsPayableCostCenter,
  AccountsPayableListFilters,
  AccountsPayableSortOptions,
  AccountsPayableStatus,
  PaginatedAccountsPayable,
} from '@/features/accounts-payable/types';
import {getSuppliersForSelect} from '@/features/suppliers/loaders';
import type {SupplierSelectOption} from '@/features/suppliers/types';
import {
  assertCompanyPermission,
  getCurrentCompanyId,
  getServerSupabaseClient,
} from '@/lib/auth/company';
import {ROUTES} from '@/constants/routes/paths';

interface ContasAPagarPageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
    status?: string;
    category?: string;
    supplier?: string;
    dueFrom?: string;
    dueTo?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

export default async function ContasAPagarPage({searchParams}: ContasAPagarPageProps) {
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    redirect(ROUTES.login);
  }

  const canRead =
    (await assertCompanyPermission(supabase, companyId, 'financeiro_pagar:read')) ||
    (await assertCompanyPermission(supabase, companyId, 'financeiro:read'));

  if (!canRead) {
    redirect(ROUTES.dashboard);
  }

  const params = await searchParams;
  const search = params.q ?? '';
  const page = Number(params.page ?? '1');

  const filters: AccountsPayableListFilters = {
    entryStatus: params.status as AccountsPayableStatus | undefined,
    categoryId: params.category,
    supplier: params.supplier,
    dueDateFrom: params.dueFrom,
    dueDateTo: params.dueTo,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  };

  const sort: AccountsPayableSortOptions = {
    sortBy: (params.sortBy as AccountsPayableSortOptions['sortBy']) ?? 'due_date',
    sortOrder: (params.sortOrder as 'asc' | 'desc') ?? 'asc',
  };

  let data: PaginatedAccountsPayable;
  let categories: AccountsPayableCategory[];
  let costCenters: AccountsPayableCostCenter[];
  let suppliers: SupplierSelectOption[];
  let companyName: string | null = null;
  let error: string | null = null;

  try {
    const [entries, filterOptions, companyRow, supplierOptions] = await Promise.all([
      listAccountsPayable(supabase, {companyId, search, page, filters, sort}),
      listAccountsPayableFilterOptions(supabase, companyId),
      supabase.from('companies').select('trade_name, legal_name').eq('id', companyId).maybeSingle(),
      getSuppliersForSelect(supabase, companyId),
    ]);

    data = entries;
    categories = filterOptions.categories;
    costCenters = filterOptions.costCenters;
    suppliers = supplierOptions;
    companyName =
      companyRow.data?.trade_name ?? companyRow.data?.legal_name ?? null;
  } catch (err) {
    error = err instanceof Error ? err.message : 'Erro ao carregar contas a pagar.';
    data = {items: [], total: 0, page: 1, pageSize: 10, totalPages: 1};
    categories = [];
    costCenters = [];
    suppliers = [];
    companyName = null;
  }

  return (
    <AccountsPayableList
      initialData={data}
      initialSearch={search}
      initialFilters={filters}
      initialSort={sort}
      categories={categories}
      costCenters={costCenters}
      suppliers={suppliers}
      companyName={companyName}
      error={error}
    />
  );
}
