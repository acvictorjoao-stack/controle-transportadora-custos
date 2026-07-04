import {redirect, notFound} from 'next/navigation';

import '@/features/financial/loaders/module-integration-loaders';
import '@/features/tires/loaders/vehicle-tires-loader';
import {listBranchesForSelect} from '@/features/organization/branches/queries';
import type {BranchSelectOption} from '@/features/organization/branches/types';
import {VehicleDetailView} from '@/features/vehicles/components';
import {getVehicleDetail} from '@/features/vehicles/queries';
import type {VehicleDetailData} from '@/features/vehicles/types';
import {
  assertCompanyPermission,
  getCurrentCompanyId,
  getServerSupabaseClient,
} from '@/lib/auth/company';
import {ROUTES} from '@/constants/routes/paths';

interface VeiculoDetailPageProps {
  params: Promise<{id: string}>;
}

export default async function VeiculoDetailPage({params}: VeiculoDetailPageProps) {
  const {id} = await params;
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    redirect(ROUTES.login);
  }

  const canRead = await assertCompanyPermission(supabase, companyId, 'vehicles:read');
  if (!canRead) {
    redirect(ROUTES.dashboard);
  }

  let data: VehicleDetailData | null;
  let branches: BranchSelectOption[];

  try {
    [data, branches] = await Promise.all([
      getVehicleDetail(supabase, companyId, id),
      listBranchesForSelect(supabase, companyId),
    ]);
  } catch {
    notFound();
  }

  if (!data) {
    notFound();
  }

  return (
    <VehicleDetailView
      companyId={companyId}
      data={data}
      branches={branches}
    />
  );
}
