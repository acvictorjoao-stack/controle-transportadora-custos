import {redirect} from 'next/navigation';

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

  let data: PaginatedTrips;
  let branches: BranchSelectOption[];
  let drivers: DriverSelectOption[];
  let vehicles: VehicleSelectOption[];
  let customers: Customer[];
  let routes: RouteSelectOption[];
  let routeFilterOptions: RouteFilterOptions;
  let resourceAvailability: TripResourceAvailability;
  let error: string | null = null;

  try {
    [
      data,
      branches,
      drivers,
      vehicles,
      customers,
      routes,
      routeFilterOptions,
      resourceAvailability,
    ] =
      await Promise.all([
        listTrips(supabase, {companyId, search, page, filters, sort}),
        listBranchesForSelect(supabase, companyId),
        listDriversForSelect(supabase, companyId),
        listVehiclesForSelect(supabase, companyId),
        listCustomersForSelect(supabase, companyId),
        listRoutesForSelect(supabase, companyId, 200),
        listRouteFilterOptions(supabase, companyId),
        listTripResourceAvailability(supabase, companyId),
      ]);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Erro ao carregar viagens.';
    data = {items: [], total: 0, page: 1, pageSize: 10, totalPages: 1};
    branches = [];
    drivers = [];
    vehicles = [];
    customers = [];
    routes = [];
    routeFilterOptions = {origins: [], destinations: []};
    resourceAvailability = {busyVehicleIds: [], busyDriverIds: []};
  }

  return (
    <TripsList
      initialData={data}
      initialSearch={search}
      initialFilters={filters}
      initialSort={sort}
      branches={branches}
      drivers={drivers}
      vehicles={vehicles}
      customers={customers}
      routes={routes}
      routeFilterOptions={routeFilterOptions}
      resourceAvailability={resourceAvailability}
      error={error}
    />
  );
}
