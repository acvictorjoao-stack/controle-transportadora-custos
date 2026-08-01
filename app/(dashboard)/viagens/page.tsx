import {Suspense} from 'react';
import {redirect} from 'next/navigation';

import type {SupabaseClient} from '@supabase/supabase-js';

import {listCustomersForSelect} from '@/features/customers/queries';
import type {Customer} from '@/features/customers/types';
import {listDriversForSelect} from '@/features/drivers/queries';
import type {DriverSelectOption} from '@/features/drivers/types';
import {listBranchesForSelect} from '@/features/organization/branches/queries';
import type {BranchSelectOption} from '@/features/organization/branches/types';
import {
  listRouteFilterOptions,
  listRoutesForSelect,
} from '@/features/routes/queries';
import type {RouteFilterOptions, RouteSelectOption} from '@/features/routes/types';
import {TripsList} from '@/features/trips/components';
import {listTripResourceAvailability, listTrips} from '@/features/trips/queries';
import type {
  PaginatedTrips,
  TripListFilters,
  TripResourceAvailability,
  TripSortOptions,
  TripStatus,
} from '@/features/trips/types';
import {listVehiclesForSelect} from '@/features/vehicles/queries';
import type {VehicleSelectOption} from '@/features/vehicles/types';
import {
  assertCompanyPermission,
  getCurrentCompanyId,
  getServerSupabaseClient,
} from '@/lib/auth/company';
import {ROUTES} from '@/constants/routes/paths';

interface ViagensPageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
    status?: string;
    driver?: string;
    vehicle?: string;
    client?: string;
    branch?: string;
    route?: string;
    origin?: string;
    destination?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

const EMPTY_SELECTS = {
  branches: [] as BranchSelectOption[],
  drivers: [] as DriverSelectOption[],
  vehicles: [] as VehicleSelectOption[],
  customers: [] as Customer[],
  routes: [] as RouteSelectOption[],
  routeFilterOptions: {origins: [], destinations: []} as RouteFilterOptions,
  resourceAvailability: {
    busyVehicleIds: [],
    busyDriverIds: [],
  } as TripResourceAvailability,
};

async function loadTripSelects(
  supabase: SupabaseClient,
  companyId: string,
) {
  const [
    branches,
    drivers,
    vehicles,
    customers,
    routes,
    routeFilterOptions,
    resourceAvailability,
  ] = await Promise.all([
    listBranchesForSelect(supabase, companyId),
    listDriversForSelect(supabase, companyId),
    listVehiclesForSelect(supabase, companyId),
    listCustomersForSelect(supabase, companyId),
    listRoutesForSelect(supabase, companyId, 200),
    listRouteFilterOptions(supabase, companyId),
    listTripResourceAvailability(supabase, companyId),
  ]);

  return {
    branches,
    drivers,
    vehicles,
    customers,
    routes,
    routeFilterOptions,
    resourceAvailability,
  };
}

async function ViagensListWithSelects({
  companyId,
  data,
  search,
  filters,
  sort,
  listError,
}: {
  companyId: string;
  data: PaginatedTrips;
  search: string;
  filters: TripListFilters;
  sort: TripSortOptions;
  listError: string | null;
}) {
  const supabase = await getServerSupabaseClient();
  let selects = EMPTY_SELECTS;
  let error = listError;

  try {
    selects = await loadTripSelects(supabase, companyId);
  } catch (err) {
    error =
      error ??
      (err instanceof Error ? err.message : 'Erro ao carregar filtros de viagens.');
  }

  return (
    <TripsList
      initialData={data}
      initialSearch={search}
      initialFilters={filters}
      initialSort={sort}
      branches={selects.branches}
      drivers={selects.drivers}
      vehicles={selects.vehicles}
      customers={selects.customers}
      routes={selects.routes}
      routeFilterOptions={selects.routeFilterOptions}
      resourceAvailability={selects.resourceAvailability}
      error={error}
    />
  );
}

export default async function ViagensPage({searchParams}: ViagensPageProps) {
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    redirect(ROUTES.login);
  }

  const canRead = await assertCompanyPermission(supabase, companyId, 'trips:read');
  if (!canRead) {
    redirect(ROUTES.dashboard);
  }

  const params = await searchParams;
  const search = params.q ?? '';
  const page = Number(params.page ?? '1');

  const filters: TripListFilters = {
    tripStatus: params.status as TripStatus | undefined,
    driverId: params.driver,
    vehicleId: params.vehicle,
    clientName: params.client,
    branchId: params.branch,
    routeId: params.route,
    origin: params.origin,
    destination: params.destination,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  };

  const sort: TripSortOptions = {
    sortBy: (params.sortBy as TripSortOptions['sortBy']) ?? 'departed_at',
    sortOrder: (params.sortOrder as 'asc' | 'desc') ?? 'desc',
  };

  let data: PaginatedTrips = {
    items: [],
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 1,
  };
  let listError: string | null = null;

  try {
    data = await listTrips(supabase, {companyId, search, page, filters, sort});
  } catch (err) {
    listError = err instanceof Error ? err.message : 'Erro ao carregar viagens.';
  }

  return (
    <Suspense
      fallback={
        <TripsList
          initialData={data}
          initialSearch={search}
          initialFilters={filters}
          initialSort={sort}
          branches={EMPTY_SELECTS.branches}
          drivers={EMPTY_SELECTS.drivers}
          vehicles={EMPTY_SELECTS.vehicles}
          customers={EMPTY_SELECTS.customers}
          routes={EMPTY_SELECTS.routes}
          routeFilterOptions={EMPTY_SELECTS.routeFilterOptions}
          resourceAvailability={EMPTY_SELECTS.resourceAvailability}
          error={listError}
        />
      }
    >
      <ViagensListWithSelects
        companyId={companyId}
        data={data}
        search={search}
        filters={filters}
        sort={sort}
        listError={listError}
      />
    </Suspense>
  );
}
