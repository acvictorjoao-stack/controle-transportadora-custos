import {redirect, notFound} from 'next/navigation';

import '@/features/financial/loaders/module-integration-loaders';
import {listDriversForSelect} from '@/features/drivers/queries';
import type {DriverSelectOption} from '@/features/drivers/types';
import {FuelDetailView} from '@/features/fuel/components';
import {getFuelDetail} from '@/features/fuel/queries';
import type {FuelDetailData} from '@/features/fuel/types';
import {listBranchesForSelect} from '@/features/organization/branches/queries';
import type {BranchSelectOption} from '@/features/organization/branches/types';
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

interface AbastecimentoDetailPageProps {
  params: Promise<{id: string}>;
}

export default async function AbastecimentoDetailPage({params}: AbastecimentoDetailPageProps) {
  const {id} = await params;
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    redirect(ROUTES.login);
  }

  const canRead = await assertCompanyPermission(supabase, companyId, 'fuel:read');
  if (!canRead) {
    redirect(ROUTES.dashboard);
  }

  let data: FuelDetailData | null;
  let branches: BranchSelectOption[];
  let drivers: DriverSelectOption[];
  let vehicles: VehicleSelectOption[];
  let suppliers: SupplierSelectOption[];

  try {
    [data, branches, drivers, vehicles, suppliers] = await Promise.all([
      getFuelDetail(supabase, companyId, id),
      listBranchesForSelect(supabase, companyId),
      listDriversForSelect(supabase, companyId),
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
    <FuelDetailView
      companyId={companyId}
      data={data}
      branches={branches}
      drivers={drivers}
      vehicles={vehicles}
      suppliers={suppliers}
    />
  );
}
