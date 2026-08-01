import {redirect} from 'next/navigation';

import {VehicleProfitabilityPageView} from '@/features/dre/components/vehicle-profitability-page-view';
import type {VehicleBarChartPoint} from '@/features/dre/components/vehicle-profitability-dashboard';
import type {PeriodChartPoint} from '@/features/dre/components/revenue-cost-profit-chart';
import {getVehicleProfitabilityDashboardData} from '@/features/dre/loaders/vehicle-profitability-dashboard-loader';
import type {
  OperationalDreByVehicleData,
  OperationalDreCustomerGroup,
  OperationalDreData,
  OperationalDreFilterOptions,
  OperationalDreRouteGroup,
} from '@/features/dre/types';
import {
  EMPTY_OPERATIONAL_DRE,
  EMPTY_OPERATIONAL_DRE_BY_VEHICLE,
  EMPTY_OPERATIONAL_DRE_FILTER_OPTIONS,
} from '@/features/dre/utils/empty-state';
import {parseOperationalDreFilters} from '@/features/dre/utils/list-url';
import type {PeriodDelta} from '@/features/dre/utils/period-comparison';
import type {
  VehicleHighlightItem,
  VehicleRankingRow,
} from '@/features/organization/dashboard/utils/rankings';
import {
  assertCompanyPermission,
  getCurrentCompanyId,
  getServerSupabaseClient,
} from '@/lib/auth/company';
import {ROUTES} from '@/constants/routes/paths';

interface VehicleProfitabilityPageProps {
  searchParams: Promise<{
    empresa?: string;
    filial?: string;
    cliente?: string;
    rota?: string;
    veiculo?: string;
    motorista?: string;
    centro?: string;
    de?: string;
    ate?: string;
    periodo?: string;
  }>;
}

const EMPTY_HIGHLIGHTS: {
  highestRevenue: VehicleHighlightItem | null;
  highestProfit: VehicleHighlightItem | null;
  highestCost: VehicleHighlightItem | null;
  lowestProfitability: VehicleHighlightItem | null;
} = {
  highestRevenue: null,
  highestProfit: null,
  highestCost: null,
  lowestProfitability: null,
};

export default async function VehicleProfitabilityPage({
  searchParams,
}: VehicleProfitabilityPageProps) {
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    redirect(ROUTES.login);
  }

  const canRead = await assertCompanyPermission(
    supabase,
    companyId,
    'financeiro:read',
  );
  if (!canRead) {
    redirect(ROUTES.dashboard);
  }

  const params = await searchParams;
  const filters = parseOperationalDreFilters(params);

  let dre: OperationalDreData = {...EMPTY_OPERATIONAL_DRE, filters};
  let byVehicle: OperationalDreByVehicleData = {
    ...EMPTY_OPERATIONAL_DRE_BY_VEHICLE,
    filters,
  };
  let byCustomerGroups: OperationalDreCustomerGroup[] = [];
  let byRouteGroups: OperationalDreRouteGroup[] = [];
  let filterOptions: OperationalDreFilterOptions =
    EMPTY_OPERATIONAL_DRE_FILTER_OPTIONS;
  let chartPoints: PeriodChartPoint[] = [];
  let revenueByVehiclePoints: VehicleBarChartPoint[] = [];
  let costByVehiclePoints: VehicleBarChartPoint[] = [];
  let profitByVehiclePoints: VehicleBarChartPoint[] = [];
  let rankingRows: VehicleRankingRow[] = [];
  let highlights = EMPTY_HIGHLIGHTS;
  let comparisons: Array<[string, PeriodDelta]> = [];
  let error: string | null = null;
  let period = filters;

  try {
    const data = await getVehicleProfitabilityDashboardData(
      supabase,
      companyId,
      filters,
    );
    dre = data.dre;
    byVehicle = data.byVehicle;
    byCustomerGroups = data.byCustomerGroups;
    byRouteGroups = data.byRouteGroups;
    filterOptions = data.filterOptions;
    chartPoints = data.chartPoints;
    revenueByVehiclePoints = data.revenueByVehiclePoints;
    costByVehiclePoints = data.costByVehiclePoints;
    profitByVehiclePoints = data.profitByVehiclePoints;
    rankingRows = data.rankingRows;
    highlights = data.highlights;
    comparisons = data.comparisons;
    period = data.period;
  } catch (err) {
    error =
      err instanceof Error
        ? err.message
        : 'Erro ao carregar a rentabilidade por veículo.';
  }

  return (
    <VehicleProfitabilityPageView
      dre={dre}
      byVehicle={byVehicle}
      byCustomerGroups={byCustomerGroups}
      byRouteGroups={byRouteGroups}
      filterOptions={filterOptions}
      initialFilters={period}
      chartPoints={chartPoints}
      revenueByVehiclePoints={revenueByVehiclePoints}
      costByVehiclePoints={costByVehiclePoints}
      profitByVehiclePoints={profitByVehiclePoints}
      rankingRows={rankingRows}
      highlights={highlights}
      comparisons={comparisons}
      error={error}
    />
  );
}
