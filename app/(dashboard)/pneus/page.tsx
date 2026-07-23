import {redirect} from 'next/navigation';

import '@/features/tires/loaders/vehicle-tires-loader';
import {TiresList} from '@/features/tires/components';
import {listTires} from '@/features/tires/queries';
import type {TireListFilters, TirePosition, PaginatedTires, TireSortOptions, TireStatus} from '@/features/tires/types';
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

interface PneusPageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
    vehicle?: string;
    branch?: string;
    status?: string;
    brand?: string;
    supplier?: string;
    position?: string;
    recap?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

export default async function PneusPage({searchParams}: PneusPageProps) {
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    redirect(ROUTES.login);
  }

  const canRead = await assertCompanyPermission(supabase, companyId, 'tires:read');
  if (!canRead) {
    redirect(ROUTES.dashboard);
  }

  const params = await searchParams;
  const search = params.q ?? '';
  const page = Number(params.page ?? '1');

  const filters: TireListFilters = {
    vehicleId: params.vehicle,
    branchId: params.branch,
    tireStatus: params.status as TireStatus | undefined,
    brand: params.brand,
    supplier: params.supplier,
    position: params.position as TirePosition | undefined,
    hasRecap: params.recap === 'true',
  };

  const sort: TireSortOptions = {
    sortBy: (params.sortBy as TireSortOptions['sortBy']) ?? 'created_at',
    sortOrder: (params.sortOrder as 'asc' | 'desc') ?? 'desc',
  };

  let data: PaginatedTires;
  let branches: BranchSelectOption[];
  let vehicles: VehicleSelectOption[];
  let suppliers: SupplierSelectOption[];
  let error: string | null = null;

  try {
    [data, branches, vehicles, suppliers] = await Promise.all([
      listTires(supabase, {companyId, search, page, filters, sort}),
      listBranchesForSelect(supabase, companyId),
      listVehiclesForSelect(supabase, companyId),
      getSuppliersForSelect(supabase, companyId),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Erro ao carregar pneus.';
    data = {items: [], total: 0, page: 1, pageSize: 10, totalPages: 1};
    branches = [];
    vehicles = [];
    suppliers = [];
  }

  return (
    <TiresList
      initialData={data}
      initialSearch={search}
      initialFilters={filters}
      initialSort={sort}
      branches={branches}
      vehicles={vehicles}
      suppliers={suppliers}
      error={error}
    />
  );
}
