import {redirect} from 'next/navigation';

import {CustomerProfitabilityPageView} from '@/features/dre/components/customer-profitability-page-view';
import {getCustomerProfitabilityDashboardData} from '@/features/dre/loaders/customer-profitability-dashboard-loader';
import type {
  OperationalDreByCustomerData,
  OperationalDreData,
  OperationalDreFilterOptions,
} from '@/features/dre/types';
import {
  EMPTY_OPERATIONAL_DRE,
  EMPTY_OPERATIONAL_DRE_BY_CUSTOMER,
  EMPTY_OPERATIONAL_DRE_FILTER_OPTIONS,
} from '@/features/dre/utils/empty-state';
import {parseOperationalDreFilters} from '@/features/dre/utils/list-url';
import type {PeriodChartPoint} from '@/features/dre/components/revenue-cost-profit-chart';
import type {CustomerBarChartPoint} from '@/features/dre/components/customer-profitability-dashboard';
import type {PeriodDelta} from '@/features/dre/utils/period-comparison';
import type {
  CustomerRankingRow,
  TopCustomerRankingItem,
} from '@/features/organization/dashboard/utils/rankings';
import {
  assertCompanyPermission,
  getCurrentCompanyId,
  getServerSupabaseClient,
} from '@/lib/auth/company';
import {ROUTES} from '@/constants/routes/paths';

interface CustomerProfitabilityPageProps {
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

export default async function CustomerProfitabilityPage({
  searchParams,
}: CustomerProfitabilityPageProps) {
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
  let byCustomer: OperationalDreByCustomerData = {
    ...EMPTY_OPERATIONAL_DRE_BY_CUSTOMER,
    filters,
  };
  let byRouteGroups: import('@/features/dre/types').OperationalDreRouteGroup[] =
    [];
  let byVehicleGroups: import('@/features/dre/types').OperationalDreVehicleGroup[] =
    [];
  let filterOptions: OperationalDreFilterOptions =
    EMPTY_OPERATIONAL_DRE_FILTER_OPTIONS;
  let chartPoints: PeriodChartPoint[] = [];
  let profitByCustomerPoints: CustomerBarChartPoint[] = [];
  let topCustomersChartPoints: CustomerBarChartPoint[] = [];
  let rankingRows: CustomerRankingRow[] = [];
  let topCustomers: TopCustomerRankingItem[] = [];
  let lossMakingCustomers: TopCustomerRankingItem[] = [];
  let comparisons: Array<[string, PeriodDelta]> = [];
  let periodComparison: PeriodDelta = {
    revenuePercent: null,
    costPercent: null,
    profitPercent: null,
    marginPoints: null,
  };
  let error: string | null = null;
  let period = filters;

  try {
    const data = await getCustomerProfitabilityDashboardData(
      supabase,
      companyId,
      filters,
    );
    dre = data.dre;
    byCustomer = data.byCustomer;
    byRouteGroups = data.byRouteGroups;
    byVehicleGroups = data.byVehicleGroups;
    filterOptions = data.filterOptions;
    chartPoints = data.chartPoints;
    profitByCustomerPoints = data.profitByCustomerPoints;
    topCustomersChartPoints = data.topCustomersChartPoints;
    rankingRows = data.rankingRows;
    topCustomers = data.topCustomers;
    lossMakingCustomers = data.lossMakingCustomers;
    comparisons = data.comparisons;
    periodComparison = data.periodComparison;
    period = data.period;
  } catch (err) {
    error =
      err instanceof Error
        ? err.message
        : 'Erro ao carregar a rentabilidade por cliente.';
  }

  return (
    <CustomerProfitabilityPageView
      dre={dre}
      byCustomer={byCustomer}
      byRouteGroups={byRouteGroups}
      byVehicleGroups={byVehicleGroups}
      filterOptions={filterOptions}
      initialFilters={period}
      chartPoints={chartPoints}
      profitByCustomerPoints={profitByCustomerPoints}
      topCustomersChartPoints={topCustomersChartPoints}
      rankingRows={rankingRows}
      topCustomers={topCustomers}
      lossMakingCustomers={lossMakingCustomers}
      comparisons={comparisons}
      periodComparison={periodComparison}
      error={error}
    />
  );
}
