import {redirect, notFound} from 'next/navigation';



import '@/features/financial/loaders/module-integration-loaders';

import {listDriversForSelect} from '@/features/drivers/queries';

import type {DriverSelectOption} from '@/features/drivers/types';

import {MaintenanceDetailView} from '@/features/maintenance/components';

import {getMaintenanceDetail} from '@/features/maintenance/queries';

import type {MaintenanceDetailData} from '@/features/maintenance/types';

import {listBranchesForSelect} from '@/features/organization/branches/queries';

import type {BranchSelectOption} from '@/features/organization/branches/types';

import {listTripsForSelect} from '@/features/trips/queries';

import type {TripSelectOption} from '@/features/trips/types';

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

  let branches: BranchSelectOption[];

  let drivers: DriverSelectOption[];

  let vehicles: VehicleSelectOption[];

  let trips: TripSelectOption[];



  try {

    [data, branches, drivers, vehicles, trips] = await Promise.all([

      getMaintenanceDetail(supabase, companyId, id),

      listBranchesForSelect(supabase, companyId),

      listDriversForSelect(supabase, companyId),

      listVehiclesForSelect(supabase, companyId),

      listTripsForSelect(supabase, companyId),

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

      branches={branches}

      drivers={drivers}

      vehicles={vehicles}

      trips={trips}

    />

  );

}


