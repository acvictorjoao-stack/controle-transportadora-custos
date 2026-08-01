import type {SupabaseClient} from '@supabase/supabase-js';

import {
  getOperationalDreBundle,
  getOperationalDreByCustomer,
  getOperationalDRE,
  getOperationalDreFilterOptions,
} from '@/features/dre/loaders';
import type {
  OperationalDreByCustomerData,
  OperationalDreByRouteData,
  OperationalDreByVehicleData,
  OperationalDreData,
  OperationalDreFilterOptions,
  OperationalDreFilters,
} from '@/features/dre/types';
import type {PeriodChartPoint} from '@/features/dre/components/revenue-cost-profit-chart';
import {
  buildDimensionComparisons,
  compareAggregatePeriods,
} from '@/features/dre/utils/period-comparison';
import type {PeriodDelta} from '@/features/dre/utils/period-comparison';
import {EMPTY_OPERATIONAL_DRE_FILTER_OPTIONS} from '@/features/dre/utils/empty-state';
import {
  buildMonthlyPeriodBuckets,
  currentMonthFilters,
  previousPeriodFilters,
} from '@/features/organization/dashboard/utils/period';
import {
  buildCustomerRankingRows,
  buildLossMakingCustomers,
  buildTopCustomers,
  type CustomerRankingRow,
  type TopCustomerRankingItem,
} from '@/features/organization/dashboard/utils/rankings';

export interface CustomerBarChartPoint {
  key: string;
  label: string;
  value: number;
}

export interface CustomerProfitabilityDashboardData {
  period: OperationalDreFilters;
  dre: OperationalDreData;
  byCustomer: OperationalDreByCustomerData;
  byRouteGroups: OperationalDreByRouteData['groups'];
  byVehicleGroups: OperationalDreByVehicleData['groups'];
  filterOptions: OperationalDreFilterOptions;
  chartPoints: PeriodChartPoint[];
  profitByCustomerPoints: CustomerBarChartPoint[];
  topCustomersChartPoints: CustomerBarChartPoint[];
  rankingRows: CustomerRankingRow[];
  topCustomers: TopCustomerRankingItem[];
  lossMakingCustomers: TopCustomerRankingItem[];
  comparisons: Array<[string, PeriodDelta]>;
  periodComparison: PeriodDelta;
}

/**
 * Composição da Rentabilidade por Cliente — reutiliza loaders DRE existentes.
 */
export async function getCustomerProfitabilityDashboardData(
  supabase: SupabaseClient,
  companyId: string,
  filters: OperationalDreFilters = {},
): Promise<CustomerProfitabilityDashboardData> {
  const fallback = currentMonthFilters();
  const period: OperationalDreFilters = {
    ...filters,
    dateFrom: filters.dateFrom ?? fallback.dateFrom,
    dateTo: filters.dateTo ?? fallback.dateTo,
  };
  const previous = previousPeriodFilters(period);
  const buckets = buildMonthlyPeriodBuckets(period, 6);

  const [bundle, previousByCustomer, previousDre, filterOptionsResult, chartSeries] =
    await Promise.all([
      getOperationalDreBundle(supabase, companyId, period),
      getOperationalDreByCustomer(supabase, companyId, previous),
      getOperationalDRE(supabase, companyId, previous),
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

  const byCustomer: OperationalDreByCustomerData = {
    groups: bundle.byCustomer,
    filters: period,
  };

  const comparisonsMap = buildDimensionComparisons(
    byCustomer.groups,
    previousByCustomer.groups,
  );

  const rankingRows = buildCustomerRankingRows(byCustomer.groups);
  const topCustomers = buildTopCustomers(byCustomer.groups, 10);
  const lossMakingCustomers = buildLossMakingCustomers(byCustomer.groups);

  const profitByCustomerPoints: CustomerBarChartPoint[] = rankingRows
    .slice(0, 12)
    .map((row) => ({
      key: row.id,
      label: row.name,
      value: row.profit,
    }));

  const topCustomersChartPoints: CustomerBarChartPoint[] = topCustomers.map(
    (customer) => ({
      key: customer.id,
      label: customer.name,
      value: customer.profit,
    }),
  );

  return {
    period,
    dre: bundle.dre,
    byCustomer,
    byRouteGroups: bundle.byRoute.groups,
    byVehicleGroups: bundle.byVehicle,
    filterOptions: filterOptionsResult ?? EMPTY_OPERATIONAL_DRE_FILTER_OPTIONS,
    chartPoints: chartSeries,
    profitByCustomerPoints,
    topCustomersChartPoints,
    rankingRows,
    topCustomers,
    lossMakingCustomers,
    comparisons: Array.from(comparisonsMap.entries()),
    periodComparison: compareAggregatePeriods(
      {
        revenue: bundle.dre.revenues.totalRevenue,
        costs: bundle.dre.costs.totalOperatingCosts,
        profit: bundle.dre.result.operatingProfit,
        marginPercent: bundle.dre.result.operatingMarginPercent,
      },
      {
        revenue: previousDre.revenues.totalRevenue,
        costs: previousDre.costs.totalOperatingCosts,
        profit: previousDre.result.operatingProfit,
        marginPercent: previousDre.result.operatingMarginPercent,
      },
    ),
  };
}
