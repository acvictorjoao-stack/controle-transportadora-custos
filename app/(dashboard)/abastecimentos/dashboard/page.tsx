import {redirect} from 'next/navigation';

import {ROUTES} from '@/constants/routes/paths';
import {FuelConsumptionDashboardView} from '@/features/fuel/components';
import {composeFuelConsumptionDashboard} from '@/features/fuel/loaders';
import type {
  FuelConsumptionDashboardData,
  FuelConsumptionDashboardFilters,
} from '@/features/fuel/types';
import {listBranchesForSelect} from '@/features/organization/branches/queries';
import type {BranchSelectOption} from '@/features/organization/branches/types';
import {listVehicles, listVehiclesForSelect} from '@/features/vehicles/queries';
import type {VehicleSelectOption} from '@/features/vehicles/types';
import {
  assertCompanyPermission,
  getCurrentCompanyId,
  getServerSupabaseClient,
} from '@/lib/auth/company';

const EMPTY_DATA: FuelConsumptionDashboardData = {
  fleet: {
    totalVehicles: 0,
    totalDistanceKm: 0,
    totalLiters: 0,
    totalFuelCost: 0,
    averageKmPerLiter: null,
    averageCostPerKm: null,
    operationalDistanceKm: 0,
    operationalFuelCost: 0,
    operationalLiters: 0,
    periodCount: 0,
  },
  vehicles: [],
  monthly: [],
  executive: {
    bestEfficiencyVehicle: null,
    worstEfficiencyVehicle: null,
    highestCostVehicle: null,
    lowestCostVehicle: null,
    operationalConsumptionPercentage: null,
  },
  ranking: [],
  alerts: [],
};

interface AbastecimentosDashboardPageProps {
  searchParams: Promise<{
    vehicle?: string;
    branch?: string;
    from?: string;
    to?: string;
  }>;
}

async function resolveVehicleIds(
  supabase: Awaited<ReturnType<typeof getServerSupabaseClient>>,
  companyId: string,
  params: {vehicle?: string; branch?: string},
): Promise<string[] | undefined> {
  if (params.vehicle) return [params.vehicle];

  if (params.branch) {
    const branchVehicles = await listVehicles(supabase, {
      companyId,
      pageSize: 500,
      filters: {branchId: params.branch},
    });
    return branchVehicles.items.map((vehicle) => vehicle.id);
  }

  return undefined;
}

export default async function AbastecimentosDashboardPage({
  searchParams,
}: AbastecimentosDashboardPageProps) {
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
  const filters: FuelConsumptionDashboardFilters = {
    vehicleIds: params.vehicle ? [params.vehicle] : undefined,
    branchId: params.branch,
    fromMonth: params.from,
    toMonth: params.to,
  };

  let data: FuelConsumptionDashboardData = EMPTY_DATA;
  let branches: BranchSelectOption[] = [];
  let vehicles: VehicleSelectOption[] = [];
  let error: string | null = null;

  try {
    const vehicleIds = await resolveVehicleIds(supabase, companyId, params);

    [data, branches, vehicles] = await Promise.all([
      composeFuelConsumptionDashboard(supabase, companyId, {
        vehicleIds,
        fromMonth: params.from,
        toMonth: params.to,
      }),
      listBranchesForSelect(supabase, companyId),
      listVehiclesForSelect(supabase, companyId),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Erro ao carregar o dashboard de consumo.';
  }

  return (
    <FuelConsumptionDashboardView
      data={data}
      branches={branches}
      vehicles={vehicles}
      initialFilters={filters}
      error={error}
    />
  );
}
