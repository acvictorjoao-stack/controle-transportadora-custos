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

/**
 * Escopo semântico dos cards AP/AR no Dashboard Executivo.
 * Valores vêm do cash-flow company-wide (estoque em aberto), sem filtros
 * operacionais e sem folha — distinto do P&L/DRE do período.
 */
export const EXECUTIVE_OPEN_BALANCE_META = {
  scope: 'company',
  period: 'open_balance',
  includesPayroll: false,
} as const;

export type ExecutiveOpenBalanceMeta = typeof EXECUTIVE_OPEN_BALANCE_META;

export interface ExecutiveDashboardKpis {
  totalRevenue: number;
  totalCosts: number;
  operatingProfit: number | null;
  operatingMarginPercent: number | null;
  totalKm: number;
  completedTrips: number;
  accountsPayable: number;
  accountsReceivable: number;
  /** Metadados dos saldos AP/AR (não afetam os valores numéricos). */
  openBalances: ExecutiveOpenBalanceMeta;
  /** Audit #6 — P&L de frete não atribuível com filtro de centro. */
  costsOnlyMode: boolean;
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

/** Monta KPIs executivos: DRE filtrada + AP/AR company-wide (estoque aberto). */
export function buildExecutiveDashboardKpis(
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
    openBalances: EXECUTIVE_OPEN_BALANCE_META,
    costsOnlyMode: dre.costsOnlyMode,
  };
}

/**
 * Caminho crítico: DRE do período/filtros + financeiro company-wide + manutenção.
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
    kpis: buildExecutiveDashboardKpis(bundle.dre, financial),
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
