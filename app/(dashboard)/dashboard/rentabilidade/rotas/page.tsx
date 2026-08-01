import {redirect} from 'next/navigation';

import {RouteProfitabilityPageView} from '@/features/dre/components/route-profitability-page-view';
import {getRouteProfitabilityDashboardData} from '@/features/dre/loaders/route-profitability-dashboard-loader';
import type {
  OperationalDreByRouteData,
  OperationalDreCustomerGroup,
  OperationalDreData,
  OperationalDreFilterOptions,
  OperationalDreVehicleGroup,
} from '@/features/dre/types';
import {
  EMPTY_OPERATIONAL_DRE,
  EMPTY_OPERATIONAL_DRE_BY_ROUTE,
  EMPTY_OPERATIONAL_DRE_FILTER_OPTIONS,
} from '@/features/dre/utils/empty-state';
import {parseOperationalDreFilters} from '@/features/dre/utils/list-url';
import type {PeriodChartPoint} from '@/features/dre/components/revenue-cost-profit-chart';
import type {PeriodDelta} from '@/features/dre/utils/period-comparison';
import type {RouteRankingRow} from '@/features/organization/dashboard/utils/rankings';
import {
  assertCompanyPermission,
  getCurrentCompanyId,
  getServerSupabaseClient,
} from '@/lib/auth/company';
import {ROUTES} from '@/constants/routes/paths';

interface RouteProfitabilityPageProps {
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

export default async function RouteProfitabilityPage({
  searchParams,
}: RouteProfitabilityPageProps) {
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    redirect(ROUTES.login);
  }

  // Despesas/centros de custo exigem financeiro:read (RLS em financial_entries / cost_centers).
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
  let byRoute: OperationalDreByRouteData = {
    ...EMPTY_OPERATIONAL_DRE_BY_ROUTE,
    filters,
  };
  let byCustomerGroups: OperationalDreCustomerGroup[] = [];
  let byVehicleGroups: OperationalDreVehicleGroup[] = [];
  let filterOptions: OperationalDreFilterOptions =
    EMPTY_OPERATIONAL_DRE_FILTER_OPTIONS;
  let chartPoints: PeriodChartPoint[] = [];
  let rankingRows: RouteRankingRow[] = [];
  let comparisons: Array<[string, PeriodDelta]> = [];
  let error: string | null = null;
  let period = filters;

  try {
    const data = await getRouteProfitabilityDashboardData(
      supabase,
      companyId,
      filters,
    );
    dre = data.dre;
    byRoute = data.byRoute;
    byCustomerGroups = data.byCustomerGroups;
    byVehicleGroups = data.byVehicleGroups;
    filterOptions = data.filterOptions;
    chartPoints = data.chartPoints;
    rankingRows = data.rankingRows;
    comparisons = data.comparisons;
    period = data.period;
  } catch (err) {
    error =
      err instanceof Error
        ? err.message
        : 'Erro ao carregar a rentabilidade por rota.';
  }

  return (
    <RouteProfitabilityPageView
      dre={dre}
      byRoute={byRoute}
      byCustomerGroups={byCustomerGroups}
      byVehicleGroups={byVehicleGroups}
      filterOptions={filterOptions}
      initialFilters={period}
      chartPoints={chartPoints}
      rankingRows={rankingRows}
      comparisons={comparisons}
      error={error}
    />
  );
}
