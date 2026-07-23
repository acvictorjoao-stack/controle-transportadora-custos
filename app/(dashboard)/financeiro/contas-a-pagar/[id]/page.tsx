import {notFound, redirect} from 'next/navigation';

import {AccountsPayableDetailView} from '@/features/accounts-payable/components';
import {
  getAccountsPayableDetail,
  listAccountsPayableFilterOptions,
} from '@/features/accounts-payable/queries';
import type {
  AccountsPayableCategory,
  AccountsPayableCostCenter,
  AccountsPayableDetailData,
} from '@/features/accounts-payable/types';
import {getSuppliersForSelect} from '@/features/suppliers/loaders';
import type {SupplierSelectOption} from '@/features/suppliers/types';
import {
  assertCompanyPermission,
  getCurrentCompanyId,
  getServerSupabaseClient,
} from '@/lib/auth/company';
import {ROUTES} from '@/constants/routes/paths';

interface ContasAPagarDetailPageProps {
  params: Promise<{id: string}>;
}

export default async function ContasAPagarDetailPage({params}: ContasAPagarDetailPageProps) {
  const {id} = await params;
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

  let data: AccountsPayableDetailData | null;
  let categories: AccountsPayableCategory[];
  let costCenters: AccountsPayableCostCenter[];
  let suppliers: SupplierSelectOption[];

  try {
    const [detail, filterOptions, supplierOptions] = await Promise.all([
      getAccountsPayableDetail(supabase, companyId, id),
      listAccountsPayableFilterOptions(supabase, companyId),
      getSuppliersForSelect(supabase, companyId),
    ]);

    data = detail;
    categories = filterOptions.categories;
    costCenters = filterOptions.costCenters;
    suppliers = supplierOptions;
  } catch {
    notFound();
  }

  if (!data) {
    notFound();
  }

  return (
    <AccountsPayableDetailView
      data={data}
      categories={categories}
      costCenters={costCenters}
      suppliers={suppliers}
    />
  );
}
