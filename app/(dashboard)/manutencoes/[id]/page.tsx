import {redirect, notFound} from 'next/navigation';

import '@/features/financial/loaders/module-integration-loaders';
import {MaintenanceDetailView} from '@/features/maintenance/components';
import {getMaintenanceDetail} from '@/features/maintenance/queries';
import type {MaintenanceDetailData} from '@/features/maintenance/types';
import {getSuppliersForSelect} from '@/features/suppliers/loaders';
import type {SupplierSelectOption} from '@/features/suppliers/types';
import {listVehiclesForSelect} from '@/features/vehicles/queries';
import type {VehicleSelectOption} from '@/features/vehicles/types';
import {
  assertCompanyPermission,
  getCurrentCompanyId,
  getServerSupabaseClient,
} from '@/lib/auth/company';
import {ROUTES} from '@/constants/routes/paths';

interface ManutencaoDetailPageProps {
  params: Promise<{id: string}>;
}

export default async function ManutencaoDetailPage({params}: ManutencaoDetailPageProps) {
  const {id} = await params;
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    redirect(ROUTES.login);
  }

  const canRead = await assertCompanyPermission(supabase, companyId, 'maintenance:read');
  if (!canRead) {
    redirect(ROUTES.dashboard);
  }

  let data: MaintenanceDetailData | null;
  let vehicles: VehicleSelectOption[];
  let suppliers: SupplierSelectOption[];

  try {
    [data, vehicles, suppliers] = await Promise.all([
      getMaintenanceDetail(supabase, companyId, id),
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
    <MaintenanceDetailView
      companyId={companyId}
      data={data}
      vehicles={vehicles}
      suppliers={suppliers}
    />
  );
}
