import {notFound, redirect} from 'next/navigation';

import '@/features/financial/loaders/module-integration-loaders';
import {listBranchesForSelect} from '@/features/organization/branches/queries';
import type {BranchSelectOption} from '@/features/organization/branches/types';
import {getSuppliersForSelect} from '@/features/suppliers/loaders';
import type {SupplierSelectOption} from '@/features/suppliers/types';
import {TireDetailView} from '@/features/tires/components';
import {getTireDetail} from '@/features/tires/loaders';
import type {TireDetailData} from '@/features/tires/types';
import {listVehiclesForSelect} from '@/features/vehicles/queries';
import type {VehicleSelectOption} from '@/features/vehicles/types';
import {
  assertCompanyPermission,
  getCurrentCompanyId,
  getServerSupabaseClient,
} from '@/lib/auth/company';
import {ROUTES} from '@/constants/routes/paths';

interface PneuDetailPageProps {
  params: Promise<{id: string}>;
}

export default async function PneuDetailPage({params}: PneuDetailPageProps) {
  const {id} = await params;
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    redirect(ROUTES.login);
  }

  const canRead = await assertCompanyPermission(supabase, companyId, 'tires:read');
  if (!canRead) {
    redirect(ROUTES.dashboard);
  }

  let data: TireDetailData | null;
  let branches: BranchSelectOption[];
  let vehicles: VehicleSelectOption[];
  let suppliers: SupplierSelectOption[];

  try {
    [data, branches, vehicles, suppliers] = await Promise.all([
      getTireDetail(supabase, companyId, id),
      listBranchesForSelect(supabase, companyId),
      listVehiclesForSelect(supabase, companyId),
      getSuppliersForSelect(supabase, companyId),
    ]);
  } catch {
    notFound();
  }

  if (!data) {
    notFound();
  }

  return (
    <TireDetailView
      companyId={companyId}
      data={data}
      branches={branches}
      vehicles={vehicles}
      suppliers={suppliers}
    />
  );
}
