import {redirect, notFound} from 'next/navigation';



import {listDriversForSelect} from '@/features/drivers/queries';

import type {DriverSelectOption} from '@/features/drivers/types';

import {FinancialDetailView} from '@/features/financial/components';

import '@/features/financial/loaders/module-integration-loaders';

import {composeFinancialDetail} from '@/features/financial/loaders';

import {listFinancialFilterOptions} from '@/features/financial/queries';

import type {

  FinancialCategory,

  FinancialCostCenter,

  FinancialDetailData,

} from '@/features/financial/types';

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



interface FinanceiroDetailPageProps {

  params: Promise<{id: string}>;

}



export default async function FinanceiroDetailPage({params}: FinanceiroDetailPageProps) {

  const {id} = await params;

  const supabase = await getServerSupabaseClient();

  const companyId = await getCurrentCompanyId(supabase);



  if (!companyId) {

    redirect(ROUTES.login);

  }



  const canRead = await assertCompanyPermission(supabase, companyId, 'financeiro:read');

  if (!canRead) {

    redirect(ROUTES.dashboard);

  }



  let data: FinancialDetailData | null;

  let branches: BranchSelectOption[];

  let drivers: DriverSelectOption[];

  let vehicles: VehicleSelectOption[];

  let trips: TripSelectOption[];

  let categories: FinancialCategory[];

  let costCenters: FinancialCostCenter[];



  try {

    const [

      detail,

      branchOptions,

      driverOptions,

      vehicleOptions,

      tripOptions,

      filterOptions,

    ] = await Promise.all([

      composeFinancialDetail(supabase, companyId, id),

      listBranchesForSelect(supabase, companyId),

      listDriversForSelect(supabase, companyId),

      listVehiclesForSelect(supabase, companyId),

      listTripsForSelect(supabase, companyId),

      listFinancialFilterOptions(supabase, companyId),

    ]);



    data = detail;

    branches = branchOptions;

    drivers = driverOptions;

    vehicles = vehicleOptions;

    trips = tripOptions;

    categories = filterOptions.categories;

    costCenters = filterOptions.costCenters;

  } catch {

    notFound();

  }



  if (!data) {

    notFound();

  }



  return (

    <FinancialDetailView

      companyId={companyId}

      data={data}

      branches={branches}

      drivers={drivers}

      vehicles={vehicles}

      trips={trips}

      categories={categories}

      costCenters={costCenters}

    />

  );

}


