import {redirect} from 'next/navigation';

import {DriverProfitabilityPageView} from '@/features/dre/components/driver-profitability-page-view';
import type {DriverBarChartPoint} from '@/features/dre/components/driver-profitability-dashboard';
import type {PeriodChartPoint} from '@/features/dre/components/revenue-cost-profit-chart';
import {getDriverProfitabilityDashboardData} from '@/features/dre/loaders/driver-profitability-dashboard-loader';
import type {
  OperationalDreByDriverData,
  OperationalDreCustomerGroup,
  OperationalDreData,
  OperationalDreFilterOptions,
  OperationalDreRouteGroup,
  OperationalDreVehicleGroup,
} from '@/features/dre/types';
import {
  EMPTY_OPERATIONAL_DRE,
  EMPTY_OPERATIONAL_DRE_BY_DRIVER,
  EMPTY_OPERATIONAL_DRE_FILTER_OPTIONS,
} from '@/features/dre/utils/empty-state';
import {parseOperationalDreFilters} from '@/features/dre/utils/list-url';
import type {PeriodDelta} from '@/features/dre/utils/period-comparison';
import type {DriverRankingRow} from '@/features/organization/dashboard/utils/rankings';
import {
  assertCompanyPermission,
  getCurrentCompanyId,
  getServerSupabaseClient,
} from '@/lib/auth/company';
import {ROUTES} from '@/constants/routes/paths';

interface DriverProfitabilityPageProps {
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

export default async function DriverProfitabilityPage({
  searchParams,
}: DriverProfitabilityPageProps) {
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
  let byDriver: OperationalDreByDriverData = {
    ...EMPTY_OPERATIONAL_DRE_BY_DRIVER,
    filters,
  };
  let byCustomerGroups: OperationalDreCustomerGroup[] = [];
  let byRouteGroups: OperationalDreRouteGroup[] = [];
  let byVehicleGroups: OperationalDreVehicleGroup[] = [];
  let filterOptions: OperationalDreFilterOptions =
    EMPTY_OPERATIONAL_DRE_FILTER_OPTIONS;
  let chartPoints: PeriodChartPoint[] = [];
  let profitByDriverPoints: DriverBarChartPoint[] = [];
  let rankingRows: DriverRankingRow[] = [];
  let comparisons: Array<[string, PeriodDelta]> = [];
  let error: string | null = null;
  let period = filters;

  try {
    const data = await getDriverProfitabilityDashboardData(
      supabase,
      companyId,
      filters,
    );
    dre = data.dre;
    byDriver = data.byDriver;
    byCustomerGroups = data.byCustomerGroups;
    byRouteGroups = data.byRouteGroups;
    byVehicleGroups = data.byVehicleGroups;
    filterOptions = data.filterOptions;
    chartPoints = data.chartPoints;
    profitByDriverPoints = data.profitByDriverPoints;
    rankingRows = data.rankingRows;
    comparisons = data.comparisons;
    period = data.period;
  } catch (err) {
    error =
      err instanceof Error
        ? err.message
        : 'Erro ao carregar a rentabilidade por motorista.';
  }

  return (
    <DriverProfitabilityPageView
      dre={dre}
      byDriver={byDriver}
      byCustomerGroups={byCustomerGroups}
      byRouteGroups={byRouteGroups}
      byVehicleGroups={byVehicleGroups}
      filterOptions={filterOptions}
      initialFilters={period}
      chartPoints={chartPoints}
      profitByDriverPoints={profitByDriverPoints}
      rankingRows={rankingRows}
      comparisons={comparisons}
      error={error}
    />
  );
}
