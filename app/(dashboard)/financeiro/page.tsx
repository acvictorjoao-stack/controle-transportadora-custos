import {redirect} from 'next/navigation';

import {listDriversForSelect} from '@/features/drivers/queries';
import type {DriverSelectOption} from '@/features/drivers/types';
import {FinancialList} from '@/features/financial/components';
import '@/features/financial/loaders/module-integration-loaders';
import {
  listFinancialEntries,
  listFinancialFilterOptions,
} from '@/features/financial/queries';
import type {
  FinancialCategory,
  FinancialCostCenter,
  FinancialEntryStatus,
  FinancialEntryType,
  FinancialListFilters,
  FinancialSortOptions,
  PaginatedFinancialEntries,
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

interface FinanceiroPageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
    vehicle?: string;
    driver?: string;
    branch?: string;
    trip?: string;
    category?: string;
    costCenter?: string;
    type?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

export default async function FinanceiroPage({searchParams}: FinanceiroPageProps) {
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    redirect(ROUTES.login);
  }

  const canRead = await assertCompanyPermission(supabase, companyId, 'financeiro:read');
  if (!canRead) {
    redirect(ROUTES.dashboard);
  }

  const params = await searchParams;
  const search = params.q ?? '';
  const page = Number(params.page ?? '1');

  const filters: FinancialListFilters = {
    vehicleId: params.vehicle,
    driverId: params.driver,
    branchId: params.branch,
    tripId: params.trip,
    categoryId: params.category,
    costCenterId: params.costCenter,
    entryType: params.type as FinancialEntryType | undefined,
    entryStatus: params.status as FinancialEntryStatus | undefined,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  };

  const sort: FinancialSortOptions = {
    sortBy: (params.sortBy as FinancialSortOptions['sortBy']) ?? 'entry_date',
    sortOrder: (params.sortOrder as 'asc' | 'desc') ?? 'desc',
  };

  let data: PaginatedFinancialEntries;
  let branches: BranchSelectOption[];
  let drivers: DriverSelectOption[];
  let vehicles: VehicleSelectOption[];
  let trips: TripSelectOption[];
  let categories: FinancialCategory[];
  let costCenters: FinancialCostCenter[];
  let error: string | null = null;

  try {
    const [entries, branchOptions, driverOptions, vehicleOptions, tripOptions, filterOptions] =
      await Promise.all([
        listFinancialEntries(supabase, {companyId, search, page, filters, sort}),
        listBranchesForSelect(supabase, companyId),
        listDriversForSelect(supabase, companyId),
        listVehiclesForSelect(supabase, companyId),
        listTripsForSelect(supabase, companyId),
        listFinancialFilterOptions(supabase, companyId),
      ]);

    data = entries;
    branches = branchOptions;
    drivers = driverOptions;
    vehicles = vehicleOptions;
    trips = tripOptions;
    categories = filterOptions.categories;
    costCenters = filterOptions.costCenters;
  } catch (err) {
    error = err instanceof Error ? err.message : 'Erro ao carregar lançamentos financeiros.';
    data = {items: [], total: 0, page: 1, pageSize: 10, totalPages: 1};
    branches = [];
    drivers = [];
    vehicles = [];
    trips = [];
    categories = [];
    costCenters = [];
  }

  return (
    <FinancialList
      initialData={data}
      initialSearch={search}
      initialFilters={filters}
      initialSort={sort}
      branches={branches}
      drivers={drivers}
      vehicles={vehicles}
      trips={trips}
      categories={categories}
      costCenters={costCenters}
      error={error}
    />
  );
}
