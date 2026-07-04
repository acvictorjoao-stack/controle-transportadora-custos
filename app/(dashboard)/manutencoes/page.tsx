import {redirect} from 'next/navigation';

import {listDriversForSelect} from '@/features/drivers/queries';
import type {DriverSelectOption} from '@/features/drivers/types';
import {MaintenanceList} from '@/features/maintenance/components';
import {listMaintenanceRecords} from '@/features/maintenance/queries';
import type {
  MaintenanceListFilters,
  MaintenanceSortOptions,
  MaintenanceStatus,
  MaintenanceType,
  PaginatedMaintenanceRecords,
} from '@/features/maintenance/types';
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

interface ManutencoesPageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
    vehicle?: string;
    driver?: string;
    branch?: string;
    type?: string;
    status?: string;
    supplier?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

export default async function ManutencoesPage({searchParams}: ManutencoesPageProps) {
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    redirect(ROUTES.login);
  }

  const canRead = await assertCompanyPermission(supabase, companyId, 'maintenance:read');
  if (!canRead) {
    redirect(ROUTES.dashboard);
  }

  const params = await searchParams;
  const search = params.q ?? '';
  const page = Number(params.page ?? '1');

  const filters: MaintenanceListFilters = {
    vehicleId: params.vehicle,
    driverId: params.driver,
    branchId: params.branch,
    maintenanceType: params.type as MaintenanceType | undefined,
    maintenanceStatus: params.status as MaintenanceStatus | undefined,
    supplier: params.supplier,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  };

  const sort: MaintenanceSortOptions = {
    sortBy: (params.sortBy as MaintenanceSortOptions['sortBy']) ?? 'opened_at',
    sortOrder: (params.sortOrder as 'asc' | 'desc') ?? 'desc',
  };

  let data: PaginatedMaintenanceRecords;
  let branches: BranchSelectOption[];
  let drivers: DriverSelectOption[];
  let vehicles: VehicleSelectOption[];
  let trips: TripSelectOption[];
  let error: string | null = null;

  try {
    [data, branches, drivers, vehicles, trips] = await Promise.all([
      listMaintenanceRecords(supabase, {companyId, search, page, filters, sort}),
      listBranchesForSelect(supabase, companyId),
      listDriversForSelect(supabase, companyId),
      listVehiclesForSelect(supabase, companyId),
      listTripsForSelect(supabase, companyId),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Erro ao carregar manutenções.';
    data = {items: [], total: 0, page: 1, pageSize: 10, totalPages: 1};
    branches = [];
    drivers = [];
    vehicles = [];
    trips = [];
  }

  return (
    <MaintenanceList
      initialData={data}
      initialSearch={search}
      initialFilters={filters}
      initialSort={sort}
      branches={branches}
      drivers={drivers}
      vehicles={vehicles}
      trips={trips}
      error={error}
    />
  );
}
