import type {SupabaseClient} from '@supabase/supabase-js';

import {
  getOperationalDreBundle,
  getOperationalDreByVehicle,
  getOperationalDRE,
  getOperationalDreFilterOptions,
} from '@/features/dre/loaders';
import type {
  OperationalDreByVehicleData,
  OperationalDreCustomerGroup,
  OperationalDreData,
  OperationalDreFilterOptions,
  OperationalDreFilters,
  OperationalDreRouteGroup,
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
  buildVehicleHighlights,
  buildVehicleRankingRows,
  type VehicleHighlightItem,
  type VehicleRankingRow,
} from '@/features/organization/dashboard/utils/rankings';

export interface VehicleBarChartPoint {
  key: string;
  label: string;
  value: number;
}

export interface VehicleProfitabilityDashboardData {
  period: OperationalDreFilters;
  dre: OperationalDreData;
  byVehicle: OperationalDreByVehicleData;
  byCustomerGroups: OperationalDreCustomerGroup[];
  byRouteGroups: OperationalDreRouteGroup[];
  filterOptions: OperationalDreFilterOptions;
  chartPoints: PeriodChartPoint[];
  revenueByVehiclePoints: VehicleBarChartPoint[];
  costByVehiclePoints: VehicleBarChartPoint[];
  profitByVehiclePoints: VehicleBarChartPoint[];
  rankingRows: VehicleRankingRow[];
  highlights: {
    highestRevenue: VehicleHighlightItem | null;
    highestProfit: VehicleHighlightItem | null;
    highestCost: VehicleHighlightItem | null;
    lowestProfitability: VehicleHighlightItem | null;
  };
  comparisons: Array<[string, PeriodDelta]>;
}

/**
 * Composição da Rentabilidade por Veículo — reutiliza loaders DRE existentes.
 */
export async function getVehicleProfitabilityDashboardData(
  supabase: SupabaseClient,
  companyId: string,
  filters: OperationalDreFilters = {},
): Promise<VehicleProfitabilityDashboardData> {
  const fallback = currentMonthFilters();
  const period: OperationalDreFilters = {
    ...filters,
    dateFrom: filters.dateFrom ?? fallback.dateFrom,
    dateTo: filters.dateTo ?? fallback.dateTo,
  };
  const previous = previousPeriodFilters(period);
  const buckets = buildMonthlyPeriodBuckets(period, 6);

  const [bundle, previousByVehicle, filterOptionsResult, chartSeries] =
    await Promise.all([
      getOperationalDreBundle(supabase, companyId, period),
      getOperationalDreByVehicle(supabase, companyId, previous),
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

  const byVehicle: OperationalDreByVehicleData = {
    groups: bundle.byVehicle,
    filters: period,
  };

  const comparisonsMap = buildDimensionComparisons(
    byVehicle.groups,
    previousByVehicle.groups,
  );

  const rankingRows = buildVehicleRankingRows(byVehicle.groups);
  const chartSlice = rankingRows.slice(0, 12);

  return {
    period,
    dre: bundle.dre,
    byVehicle,
    byCustomerGroups: bundle.byCustomer,
    byRouteGroups: bundle.byRoute.groups,
    filterOptions: filterOptionsResult ?? EMPTY_OPERATIONAL_DRE_FILTER_OPTIONS,
    chartPoints: chartSeries,
    revenueByVehiclePoints: chartSlice.map((row) => ({
      key: row.id,
      label: row.name,
      value: row.revenue,
    })),
    costByVehiclePoints: chartSlice.map((row) => ({
      key: row.id,
      label: row.name,
      value: row.costs,
    })),
    profitByVehiclePoints: chartSlice.map((row) => ({
      key: row.id,
      label: row.name,
      value: row.profit,
    })),
    rankingRows,
    highlights: buildVehicleHighlights(byVehicle.groups),
    comparisons: Array.from(comparisonsMap.entries()),
  };
}
