import {notFound, redirect} from 'next/navigation';

import {AccountsReceivableDetailView} from '@/features/accounts-receivable/components';
import {
  getAccountsReceivableDetail,
  listAccountsReceivableFilterOptions,
} from '@/features/accounts-receivable/queries';
import type {
  AccountsReceivableCategory,
  AccountsReceivableCostCenter,
  AccountsReceivableDetailData,
} from '@/features/accounts-receivable/types';
import {
  assertCompanyPermission,
  getCurrentCompanyId,
  getServerSupabaseClient,
} from '@/lib/auth/company';
import {ROUTES} from '@/constants/routes/paths';

interface ContasAReceberDetailPageProps {
  params: Promise<{id: string}>;
}

export default async function ContasAReceberDetailPage({
  params,
}: ContasAReceberDetailPageProps) {
  const {id} = await params;
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

  let data: AccountsReceivableDetailData | null;
  let categories: AccountsReceivableCategory[];
  let costCenters: AccountsReceivableCostCenter[];

  try {
    const [detail, filterOptions] = await Promise.all([
      getAccountsReceivableDetail(supabase, companyId, id),
      listAccountsReceivableFilterOptions(supabase, companyId),
    ]);

    data = detail;
    categories = filterOptions.categories;
    costCenters = filterOptions.costCenters;
  } catch {
    notFound();
  }

  if (!data) {
    notFound();
  }

  return (
    <AccountsReceivableDetailView
      data={data}
      categories={categories}
      costCenters={costCenters}
    />
  );
}
