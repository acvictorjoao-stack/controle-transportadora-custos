import {notFound, redirect} from 'next/navigation';

import {ROUTES} from '@/constants/routes/paths';
import {listCustomersForSelect} from '@/features/customers/queries';
import {listBranchesForSelect} from '@/features/organization/branches/queries';
import {RouteDetailView} from '@/features/routes/components';
import {getRouteDetail} from '@/features/routes/queries';
import type {RouteDetailData} from '@/features/routes/types';
import {
  assertCompanyPermission,
  getCurrentCompanyId,
  getServerSupabaseClient,
} from '@/lib/auth/company';

interface RotaDetailPageProps {
  params: Promise<{id: string}>;
}

export default async function RotaDetailPage({params}: RotaDetailPageProps) {
  const {id} = await params;
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    redirect(ROUTES.login);
  }

  const canRead = await assertCompanyPermission(supabase, companyId, 'routes:read');
  if (!canRead) {
    redirect(ROUTES.dashboard);
  }

  let data: RouteDetailData | null;
  let customers: {id: string; label: string}[] = [];
  let branches: {id: string; label: string}[] = [];

  try {
    const [detail, customerRows, branchRows] = await Promise.all([
      getRouteDetail(supabase, companyId, id),
      listCustomersForSelect(supabase, companyId),
      listBranchesForSelect(supabase, companyId),
    ]);
    data = detail;
    customers = customerRows.map((customer) => ({
      id: customer.id,
      label: customer.displayName,
    }));
    branches = branchRows.map((branch) => ({
      id: branch.id,
      label: branch.name,
    }));
  } catch {
    notFound();
  }

  if (!data) {
    notFound();
  }

  return (
    <RouteDetailView data={data} customers={customers} branches={branches} />
  );
}
