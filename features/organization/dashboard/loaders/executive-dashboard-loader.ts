import type {SupabaseClient} from '@supabase/supabase-js';

import {getOperationalDreBundle, getOperationalDreByRoute} from '@/features/dre/loaders';
import type {
  OperationalDreData,
  OperationalDreFilters,
  OperationalDreRouteGroup,
} from '@/features/dre/types';
import {getFinancialDashboardData} from '@/features/financial-dashboard/queries';
import type {FinancialDashboardData} from '@/features/financial-dashboard/types';
import {getMaintenanceStats} from '@/features/maintenance/queries';
import type {MaintenanceStats} from '@/features/maintenance/types';

import {buildOperationalAlerts, type OperationalAlertItem} from '../utils/alerts';
import {
  currentMonthFilters,
  previousPeriodFilters,
} from '../utils/period';
import {
  buildTopCustomers,
  buildTopRoutes,
  type TopCustomerRankingItem,
  type TopRouteRankingItem,
} from '../utils/rankings';

export interface ExecutiveDashboardKpis {
  totalRevenue: number;
  totalCosts: number;
  operatingProfit: number;
  operatingMarginPercent: number | null;
  totalKm: number;
  completedTrips: number;
  accountsPayable: number;
  accountsReceivable: number;
}

export interface ExecutiveDashboardData {
  period: OperationalDreFilters;
  kpis: ExecutiveDashboardKpis;
  topRoutes: TopRouteRankingItem[];
  topCustomers: TopCustomerRankingItem[];
  alerts: OperationalAlertItem[];
  dre: OperationalDreData;
  byRoute: {groups: OperationalDreRouteGroup[]; filters: OperationalDreFilters};
  financial: FinancialDashboardData;
  maintenance: MaintenanceStats;
}

function buildKpis(
  dre: OperationalDreData,
  financial: FinancialDashboardData,
): ExecutiveDashboardKpis {
  return {
    totalRevenue: dre.revenues.totalRevenue,
    totalCosts: dre.costs.totalOperatingCosts,
    operatingProfit: dre.result.operatingProfit,
    operatingMarginPercent: dre.result.operatingMarginPercent,
    totalKm: dre.indicators.totalKm,
    completedTrips: dre.indicators.tripCount,
    accountsPayable: financial.contasAPagar.total,
    accountsReceivable: financial.contasAReceber.total,
  };
}

/**
 * Composição executiva — reutiliza loaders DRE / Financial / Maintenance.
 * Rankings e alertas são calculados em memória.
 */
export async function getExecutiveDashboardData(
  supabase: SupabaseClient,
  companyId: string,
  filters: OperationalDreFilters = currentMonthFilters(),
): Promise<ExecutiveDashboardData> {
  const period = {
    ...filters,
    dateFrom: filters.dateFrom ?? currentMonthFilters().dateFrom,
    dateTo: filters.dateTo ?? currentMonthFilters().dateTo,
  };
  const previous = previousPeriodFilters(period);

  const [bundle, previousBundle, financial, maintenance] = await Promise.all([
    getOperationalDreBundle(supabase, companyId, period),
    getOperationalDreBundle(supabase, companyId, previous),
    getFinancialDashboardData(supabase, companyId),
    getMaintenanceStats(supabase, companyId),
  ]);

  const topRoutes = buildTopRoutes(bundle.byRoute.groups);
  const topCustomers = buildTopCustomers(bundle.byCustomer);
  const previousCustomers = buildTopCustomers(previousBundle.byCustomer);

  const alerts = buildOperationalAlerts({
    financial,
    maintenance,
    currentRoutes: bundle.byRoute.groups,
    topCustomers,
    previousCustomers,
  });

  return {
    period,
    kpis: buildKpis(bundle.dre, financial),
    topRoutes,
    topCustomers,
    alerts,
    dre: bundle.dre,
    byRoute: bundle.byRoute,
    financial,
    maintenance,
  };
}

export type {TopCustomerRankingItem, TopRouteRankingItem, OperationalAlertItem};
