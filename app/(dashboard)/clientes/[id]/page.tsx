import {notFound, redirect} from 'next/navigation';

import {CustomerDetailView} from '@/features/customers/components';
import {composeCustomerDetail} from '@/features/customers/loaders/customer-detail-loader';
import '@/features/customers/loaders/module-integration-loaders';
import {listBranchesForSelect} from '@/features/organization/branches/queries';
import type {BranchSelectOption} from '@/features/organization/branches/types';
import type {CustomerDetailData} from '@/features/customers/types';
import {
  assertCompanyPermission,
  getCurrentCompanyId,
  getServerSupabaseClient,
} from '@/lib/auth/company';
import {ROUTES} from '@/constants/routes/paths';

interface ClienteDetailPageProps {
  params: Promise<{id: string}>;
}

export default async function ClienteDetailPage({params}: ClienteDetailPageProps) {
  const {id} = await params;
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    redirect(ROUTES.login);
  }

  const canRead = await assertCompanyPermission(supabase, companyId, 'customers:read');
  if (!canRead) {
    redirect(ROUTES.dashboard);
  }

  let data: CustomerDetailData | null;
  let branches: BranchSelectOption[];

  try {
    [data, branches] = await Promise.all([
      composeCustomerDetail(supabase, companyId, id),
      listBranchesForSelect(supabase, companyId),
    ]);
  } catch {
    notFound();
  }

  if (!data) {
    notFound();
  }

  return (
    <CustomerDetailView
      companyId={companyId}
      data={data}
      branches={branches}
    />
  );
}
