import type {SupabaseClient} from '@supabase/supabase-js';

import {getOperationalDreBundle} from '@/features/dre/loaders';
import type {
  OperationalDreData,
  OperationalDreFilters,
  OperationalDreRouteGroup,
} from '@/features/dre/types';
import {listRoutesWithoutLeadTime} from '@/features/cadastro-quality/queries';
import type {CadastroQualityRouteItem} from '@/features/cadastro-quality/types';
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

export interface ExecutiveDashboardCoreData {
  period: OperationalDreFilters;
  kpis: ExecutiveDashboardKpis;
  topRoutes: TopRouteRankingItem[];
  topCustomers: TopCustomerRankingItem[];
  dre: OperationalDreData;
  byRoute: {groups: OperationalDreRouteGroup[]; filters: OperationalDreFilters};
  financial: FinancialDashboardData;
  maintenance: MaintenanceStats;
}

export interface ExecutiveDashboardSecondaryData {
  alerts: OperationalAlertItem[];
  routesWithoutLeadTime: CadastroQualityRouteItem[];
}

export interface ExecutiveDashboardData
  extends ExecutiveDashboardCoreData,
    ExecutiveDashboardSecondaryData {}

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
 * Caminho crítico: período atual + financeiro + manutenção (KPIs e rankings).
 */
export async function getExecutiveDashboardCore(
  supabase: SupabaseClient,
  companyId: string,
  filters: OperationalDreFilters = currentMonthFilters(),
): Promise<ExecutiveDashboardCoreData> {
  const period = {
    ...filters,
    dateFrom: filters.dateFrom ?? currentMonthFilters().dateFrom,
    dateTo: filters.dateTo ?? currentMonthFilters().dateTo,
  };

  const [bundle, financial, maintenance] = await Promise.all([
    getOperationalDreBundle(supabase, companyId, period),
    getFinancialDashboardData(supabase, companyId),
    getMaintenanceStats(supabase, companyId),
  ]);

  return {
    period,
    kpis: buildKpis(bundle.dre, financial),
    topRoutes: buildTopRoutes(bundle.byRoute.groups),
    topCustomers: buildTopCustomers(bundle.byCustomer),
    dre: bundle.dre,
    byRoute: bundle.byRoute,
    financial,
    maintenance,
  };
}

/**
 * Dados secundários: período anterior (alertas comparativos) + qualidade de cadastro.
 */
export async function getExecutiveDashboardSecondary(
  supabase: SupabaseClient,
  companyId: string,
  core: ExecutiveDashboardCoreData,
): Promise<ExecutiveDashboardSecondaryData> {
  const previous = previousPeriodFilters(core.period);

  const [previousBundle, routesWithoutLeadTime] = await Promise.all([
    getOperationalDreBundle(supabase, companyId, previous),
    listRoutesWithoutLeadTime(supabase, companyId).catch(() => []),
  ]);

  const previousCustomers = buildTopCustomers(previousBundle.byCustomer);

  const alerts = buildOperationalAlerts({
    financial: core.financial,
    maintenance: core.maintenance,
    currentRoutes: core.byRoute.groups,
    topCustomers: core.topCustomers,
    previousCustomers,
    routesWithoutLeadTimeCount: routesWithoutLeadTime.length,
  });

  return {
    alerts,
    routesWithoutLeadTime,
  };
}

/**
 * Composição executiva completa — reutiliza loaders DRE / Financial / Maintenance.
 */
export async function getExecutiveDashboardData(
  supabase: SupabaseClient,
  companyId: string,
  filters: OperationalDreFilters = currentMonthFilters(),
): Promise<ExecutiveDashboardData> {
  const core = await getExecutiveDashboardCore(supabase, companyId, filters);
  const secondary = await getExecutiveDashboardSecondary(
    supabase,
    companyId,
    core,
  );
  return {...core, ...secondary};
}

export type {TopCustomerRankingItem, TopRouteRankingItem, OperationalAlertItem};
