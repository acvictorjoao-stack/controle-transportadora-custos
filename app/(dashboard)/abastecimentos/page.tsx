import {redirect} from 'next/navigation';

import {listDriversForSelect} from '@/features/drivers/queries';
import type {DriverSelectOption} from '@/features/drivers/types';
import {FuelList} from '@/features/fuel/components';
import {listFuelRecords} from '@/features/fuel/queries';
import type {FuelListFilters, FuelSortOptions, FuelType, PaginatedFuelRecords} from '@/features/fuel/types';
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

interface AbastecimentosPageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
    vehicle?: string;
    driver?: string;
    branch?: string;
    fuelType?: string;
    city?: string;
    station?: string;
    dateFrom?: string;
    dateTo?: string;
    inconsistent?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

export default async function AbastecimentosPage({searchParams}: AbastecimentosPageProps) {
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    redirect(ROUTES.login);
  }

  const canRead = await assertCompanyPermission(supabase, companyId, 'fuel:read');
  if (!canRead) {
    redirect(ROUTES.dashboard);
  }

  const params = await searchParams;
  const search = params.q ?? '';
  const page = Number(params.page ?? '1');

  const filters: FuelListFilters = {
    vehicleId: params.vehicle,
    driverId: params.driver,
    branchId: params.branch,
    fuelType: params.fuelType as FuelType | undefined,
    city: params.city,
    stationName: params.station,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    inconsistentOnly: params.inconsistent === '1',
  };

  const sort: FuelSortOptions = {
    sortBy: (params.sortBy as FuelSortOptions['sortBy']) ?? 'fueled_at',
    sortOrder: (params.sortOrder as 'asc' | 'desc') ?? 'desc',
  };

  let data: PaginatedFuelRecords;
  let branches: BranchSelectOption[];
  let drivers: DriverSelectOption[];
  let vehicles: VehicleSelectOption[];
  let suppliers: SupplierSelectOption[];
  let error: string | null = null;

  try {
    [data, branches, drivers, vehicles, suppliers] = await Promise.all([
      listFuelRecords(supabase, {companyId, search, page, filters, sort}),
      listBranchesForSelect(supabase, companyId),
      listDriversForSelect(supabase, companyId),
      listVehiclesForSelect(supabase, companyId),
      getSuppliersForSelect(supabase, companyId),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Erro ao carregar abastecimentos.';
    data = {items: [], total: 0, page: 1, pageSize: 10, totalPages: 1};
    branches = [];
    drivers = [];
    vehicles = [];
    suppliers = [];
  }

  return (
    <FuelList
      initialData={data}
      initialSearch={search}
      initialFilters={filters}
      initialSort={sort}
      branches={branches}
      drivers={drivers}
      vehicles={vehicles}
      suppliers={suppliers}
      error={error}
    />
  );
}
