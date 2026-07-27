import type {SupabaseClient} from '@supabase/supabase-js';

import {
  getOperationalDreBundle,
  getOperationalDreByRoute,
  getOperationalDRE,
  getOperationalDreFilterOptions,
} from '@/features/dre/loaders';
import type {
  OperationalDreByRouteData,
  OperationalDreCustomerGroup,
  OperationalDreData,
  OperationalDreFilterOptions,
  OperationalDreFilters,
  OperationalDreVehicleGroup,
} from '@/features/dre/types';
import type {PeriodChartPoint} from '@/features/dre/components/revenue-cost-profit-chart';
import {buildRouteComparisons} from '@/features/dre/utils/period-comparison';
import type {PeriodDelta} from '@/features/dre/utils/period-comparison';
import {
  buildMonthlyPeriodBuckets,
  currentMonthFilters,
  previousPeriodFilters,
} from '@/features/organization/dashboard/utils/period';
import {
  buildRouteRankingRows,
  type RouteRankingRow,
} from '@/features/organization/dashboard/utils/rankings';

export interface RouteProfitabilityDashboardData {
  period: OperationalDreFilters;
  dre: OperationalDreData;
  byRoute: OperationalDreByRouteData;
  byCustomerGroups: OperationalDreCustomerGroup[];
  byVehicleGroups: OperationalDreVehicleGroup[];
  filterOptions: OperationalDreFilterOptions;
  chartPoints: PeriodChartPoint[];
  rankingRows: RouteRankingRow[];
  comparisons: Array<[string, PeriodDelta]>;
}

/**
 * Composição da Rentabilidade por Rota — reutiliza loaders DRE existentes.
 */
export async function getRouteProfitabilityDashboardData(
  supabase: SupabaseClient,
  companyId: string,
  filters: OperationalDreFilters = {},
): Promise<RouteProfitabilityDashboardData> {
  const fallback = currentMonthFilters();
  const period: OperationalDreFilters = {
    ...filters,
    dateFrom: filters.dateFrom ?? fallback.dateFrom,
    dateTo: filters.dateTo ?? fallback.dateTo,
  };
  const previous = previousPeriodFilters(period);
  const buckets = buildMonthlyPeriodBuckets(period, 6);

  const [bundle, previousByRoute, filterOptions, chartSeries] = await Promise.all([
    getOperationalDreBundle(supabase, companyId, period),
    getOperationalDreByRoute(supabase, companyId, previous),
    getOperationalDreFilterOptions(supabase, companyId),
    Promise.all(
      buckets.map(async (bucket) => {
        const dre = await getOperationalDRE(supabase, companyId, bucket.filters);
        return {
          key: bucket.key,
          label: bucket.label,
          revenue: dre.revenues.totalRevenue,
          costs: dre.costs.totalOperatingCosts,
          profit: dre.result.operatingProfit,
        } satisfies PeriodChartPoint;
      }),
    ),
  ]);

  const comparisonsMap = buildRouteComparisons(
    bundle.byRoute.groups,
    previousByRoute.groups,
  );

  return {
    period,
    dre: bundle.dre,
    byRoute: bundle.byRoute,
    byCustomerGroups: bundle.byCustomer,
    byVehicleGroups: bundle.byVehicle,
    filterOptions,
    chartPoints: chartSeries,
    rankingRows: buildRouteRankingRows(bundle.byRoute.groups),
    comparisons: Array.from(comparisonsMap.entries()),
  };
}
