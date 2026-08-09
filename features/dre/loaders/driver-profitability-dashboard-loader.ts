import type {SupabaseClient} from '@supabase/supabase-js';

import {
  getOperationalDreBundle,
  getOperationalDreByDriver,
  getOperationalDRE,
  getOperationalDreFilterOptions,
} from '@/features/dre/loaders';
import type {
  OperationalDreByDriverData,
  OperationalDreCustomerGroup,
  OperationalDreData,
  OperationalDreFilterOptions,
  OperationalDreFilters,
  OperationalDreRouteGroup,
  OperationalDreVehicleGroup,
} from '@/features/dre/types';
import type {PeriodChartPoint} from '@/features/dre/components/revenue-cost-profit-chart';
import {buildDimensionComparisons} from '@/features/dre/utils/period-comparison';
import type {PeriodDelta} from '@/features/dre/utils/period-comparison';
import {EMPTY_OPERATIONAL_DRE_FILTER_OPTIONS} from '@/features/dre/utils/empty-state';
import {
  buildMonthlyPeriodBuckets,
  currentMonthFilters,
  previousPeriodFilters,
} from '@/features/organization/dashboard/utils/period';
import {
  buildDriverRankingRows,
  type DriverRankingRow,
} from '@/features/organization/dashboard/utils/rankings';

export interface DriverBarChartPoint {
  key: string;
  label: string;
  value: number;
}

export interface DriverProfitabilityDashboardData {
  period: OperationalDreFilters;
  dre: OperationalDreData;
  byDriver: OperationalDreByDriverData;
  byCustomerGroups: OperationalDreCustomerGroup[];
  byRouteGroups: OperationalDreRouteGroup[];
  byVehicleGroups: OperationalDreVehicleGroup[];
  filterOptions: OperationalDreFilterOptions;
  chartPoints: PeriodChartPoint[];
  profitByDriverPoints: DriverBarChartPoint[];
  rankingRows: DriverRankingRow[];
  comparisons: Array<[string, PeriodDelta]>;
}

/**
 * Composição da Rentabilidade por Motorista — reutiliza loaders DRE existentes.
 */
export async function getDriverProfitabilityDashboardData(
  supabase: SupabaseClient,
  companyId: string,
  filters: OperationalDreFilters = {},
): Promise<DriverProfitabilityDashboardData> {
  const fallback = currentMonthFilters();
  const period: OperationalDreFilters = {
    ...filters,
    dateFrom: filters.dateFrom ?? fallback.dateFrom,
    dateTo: filters.dateTo ?? fallback.dateTo,
  };
  const previous = previousPeriodFilters(period);
  const buckets = buildMonthlyPeriodBuckets(period, 6);

  const [bundle, previousByDriver, filterOptionsResult, chartSeries] =
    await Promise.all([
      getOperationalDreBundle(supabase, companyId, period),
      getOperationalDreByDriver(supabase, companyId, previous),
      getOperationalDreFilterOptions(supabase, companyId).catch(() => null),
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

  const byDriver: OperationalDreByDriverData = {
    groups: bundle.byDriver,
    filters: period,
  };

  const comparisonsMap = buildDimensionComparisons(
    byDriver.groups,
    previousByDriver.groups,
  );

  const rankingRows = buildDriverRankingRows(byDriver.groups);
  const chartSlice = rankingRows.slice(0, 12);

  return {
    period,
    dre: bundle.dre,
    byDriver,
    byCustomerGroups: bundle.byCustomer,
    byRouteGroups: bundle.byRoute.groups,
    byVehicleGroups: bundle.byVehicle,
    filterOptions: filterOptionsResult ?? EMPTY_OPERATIONAL_DRE_FILTER_OPTIONS,
    chartPoints: chartSeries,
    profitByDriverPoints: chartSlice.map((row) => ({
      key: row.id,
      label: row.name,
      value: row.profit,
    })),
    rankingRows,
    comparisons: Array.from(comparisonsMap.entries()),
  };
}
