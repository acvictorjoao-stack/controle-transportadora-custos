import {redirect, notFound} from 'next/navigation';



import {listCustomersForSelect} from '@/features/customers/queries';

import type {Customer} from '@/features/customers/types';

import {listDriversForSelect} from '@/features/drivers/queries';

import type {DriverSelectOption} from '@/features/drivers/types';

import '@/features/financial/loaders/module-integration-loaders';

import {listBranchesForSelect} from '@/features/organization/branches/queries';

import type {BranchSelectOption} from '@/features/organization/branches/types';

import {TripDetailView} from '@/features/trips/components';

import {getTripDetail} from '@/features/trips/queries';

import type {TripDetailData} from '@/features/trips/types';

import {listVehiclesForSelect} from '@/features/vehicles/queries';

import type {VehicleSelectOption} from '@/features/vehicles/types';

import {

  assertCompanyPermission,

  getCurrentCompanyId,

  getServerSupabaseClient,

} from '@/lib/auth/company';

import {ROUTES} from '@/constants/routes/paths';



interface ViagemDetailPageProps {

  params: Promise<{id: string}>;

}



export default async function ViagemDetailPage({params}: ViagemDetailPageProps) {

  const {id} = await params;

  const supabase = await getServerSupabaseClient();

  const companyId = await getCurrentCompanyId(supabase);



  if (!companyId) {

    redirect(ROUTES.login);

  }



  const canRead = await assertCompanyPermission(supabase, companyId, 'trips:read');

  if (!canRead) {

    redirect(ROUTES.dashboard);

  }



  let data: TripDetailData | null;

  let branches: BranchSelectOption[];

  let drivers: DriverSelectOption[];

  let vehicles: VehicleSelectOption[];

  let customers: Customer[];



  try {

    [data, branches, drivers, vehicles, customers] = await Promise.all([

      getTripDetail(supabase, companyId, id),

      listBranchesForSelect(supabase, companyId),

      listDriversForSelect(supabase, companyId),

      listVehiclesForSelect(supabase, companyId),

      listCustomersForSelect(supabase, companyId),

    ]);

  } catch {

    notFound();

  }



  if (!data) {

    notFound();

  }



  return (

    <TripDetailView

      companyId={companyId}

      data={data}

      branches={branches}

      drivers={drivers}

      vehicles={vehicles}

      customers={customers}

    />

  );

}


