import {redirect} from 'next/navigation';

import {listBranchesForSelect} from '@/features/organization/branches/queries';
import {VehiclesList} from '@/features/vehicles/components';
import {listVehicles} from '@/features/vehicles/queries';
import type {BranchSelectOption} from '@/features/organization/branches/types';
import type {VehicleAssetStatus, VehicleListFilters, VehicleSortOptions} from '@/features/vehicles/types';
import {
  assertCompanyPermission,
  getCurrentCompanyId,
  getServerSupabaseClient,
} from '@/lib/auth/company';
import {ROUTES} from '@/constants/routes/paths';

interface VeiculosPageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
    plate?: string;
    status?: string;
    branch?: string;
    type?: string;
    brand?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

export default async function VeiculosPage({searchParams}: VeiculosPageProps) {
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    redirect(ROUTES.login);
  }

  const canRead = await assertCompanyPermission(supabase, companyId, 'vehicles:read');
  if (!canRead) {
    redirect(ROUTES.dashboard);
  }

  const params = await searchParams;
  const search = params.q ?? '';
  const page = Number(params.page ?? '1');

  const filters: VehicleListFilters = {
    plate: params.plate,
    assetStatus: params.status as VehicleAssetStatus | undefined,
    branchId: params.branch,
    vehicleType: params.type,
    brand: params.brand,
  };

  const sort: VehicleSortOptions = {
    sortBy: (params.sortBy as VehicleSortOptions['sortBy']) ?? 'plate',
    sortOrder: (params.sortOrder as 'asc' | 'desc') ?? 'asc',
  };

  let data;
  let branches: BranchSelectOption[];
  let error: string | null = null;

  try {
    [data, branches] = await Promise.all([
      listVehicles(supabase, {companyId, search, page, filters, sort}),
      listBranchesForSelect(supabase, companyId),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Erro ao carregar veículos.';
    data = {items: [], total: 0, page: 1, pageSize: 10, totalPages: 1};
    branches = [];
  }

  return (
    <VehiclesList
      initialData={data}
      initialSearch={search}
      initialFilters={filters}
      initialSort={sort}
      branches={branches}
      error={error}
    />
  );
}
