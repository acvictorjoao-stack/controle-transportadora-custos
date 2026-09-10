import {getTripFreightValue} from '@/features/trips/utils/trip-lifecycle';

import {
  DRE_ACCOUNTS_PAYABLE_SOURCE_MODULE,
  DRE_ANALYTICAL_LABELS,
  DRE_COST_BUCKET_TO_ANALYTICAL,
  DRE_FINANCIAL_CATEGORY_SLUGS,
  DRE_FINANCIAL_SOURCE_MODULES,
} from '../constants';
import type {
  OperationalDreAnalyticalRow,
  OperationalDreCostBucket,
  OperationalDreCostCenterBreakdown,
  OperationalDreCostCenterRow,
  OperationalDreCosts,
  OperationalDreData,
  OperationalDreExpenseRow,
  OperationalDreFilters,
  OperationalDreIndicators,
  OperationalDreTripRow,
} from '../types';
import {expenseMatchesCompetenceScope} from './operational-dre-expense-scope';
import {isOperationalDreCostsOnlyMode} from './operational-dre-costs-only';

function asFinite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function guardedRatio(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return numerator / denominator;
}

function percentOfRevenue(value: number, revenue: number): number | null {
  if (revenue <= 0) return null;
  return (value / revenue) * 100;
}

/**
 * Classifica uma despesa em um único bucket (sem double-counting),
 * alinhado à prioridade de `get_financial_stats` (combustível/manutenção/pneus)
 * e às linhas de Custos Financeiros / Contas Operacionais da DRE.
 */
export function categorizeExpense(row: OperationalDreExpenseRow): OperationalDreCostBucket {
  const slug = row.categorySlug;
  if (slug === 'combustivel' || row.fuelRecordId) return 'fuel';
  if (slug === 'manutencao' || row.maintenanceRecordId) return 'maintenance';
  if (slug === 'pneus' || row.tireId) return 'tires';

  if (row.sourceModule === DRE_ACCOUNTS_PAYABLE_SOURCE_MODULE) {
    return 'accountsPayable';
  }

  const isFinancialSource = DRE_FINANCIAL_SOURCE_MODULES.includes(
    row.sourceModule as (typeof DRE_FINANCIAL_SOURCE_MODULES)[number],
  );
  const isFinancialCategory = DRE_FINANCIAL_CATEGORY_SLUGS.includes(
    slug as (typeof DRE_FINANCIAL_CATEGORY_SLUGS)[number],
  );
  if (isFinancialSource || isFinancialCategory) return 'financial';

  return 'other';
}

export function sumFreightRevenue(trips: OperationalDreTripRow[]): number {
  return trips.reduce(
    (sum, trip) =>
      sum +
      getTripFreightValue({
        contractedFreightValue: trip.contractedFreightValue,
        actualFreightValue: trip.actualFreightValue,
      }),
    0,
  );
}

export function aggregateCosts(expenses: OperationalDreExpenseRow[]): OperationalDreCosts {
  const costs: OperationalDreCosts = {
    fuel: 0,
    maintenance: 0,
    tires: 0,
    financial: 0,
    accountsPayable: 0,
    other: 0,
    totalOperatingCosts: 0,
  };

  for (const expense of expenses) {
    const amount = asFinite(expense.amount);
    const bucket = categorizeExpense(expense);
    costs[bucket] += amount;
  }

  costs.totalOperatingCosts =
    costs.fuel +
    costs.maintenance +
    costs.tires +
    costs.financial +
    costs.accountsPayable +
    costs.other;

  return costs;
}

export function buildIndicators(input: {
  totalRevenue: number;
  totalOperatingCosts: number;
  operatingProfit: number | null;
  tripCount: number;
  totalKm: number;
  customersServed: number;
  routesUsed: number;
  vehiclesUsed: number;
  /** Audit #6 — anula ratios assimétricos (custo/receita vs volume operacional). */
  costsOnlyMode?: boolean;
}): OperationalDreIndicators {
  const {
    totalRevenue,
    totalOperatingCosts,
    operatingProfit,
    tripCount,
    totalKm,
    customersServed,
    routesUsed,
    vehiclesUsed,
    costsOnlyMode = false,
  } = input;

  if (costsOnlyMode) {
    return {
      revenuePerKm: null,
      costPerKm: null,
      profitPerKm: null,
      revenuePerTrip: null,
      costPerTrip: null,
      profitPerTrip: null,
      tripCount,
      totalKm,
      customersServed,
      routesUsed,
      vehiclesUsed,
    };
  }

  return {
    revenuePerKm: guardedRatio(totalRevenue, totalKm),
    costPerKm: guardedRatio(totalOperatingCosts, totalKm),
    profitPerKm:
      operatingProfit == null ? null : guardedRatio(operatingProfit, totalKm),
    revenuePerTrip: guardedRatio(totalRevenue, tripCount),
    costPerTrip: guardedRatio(totalOperatingCosts, tripCount),
    profitPerTrip:
      operatingProfit == null ? null : guardedRatio(operatingProfit, tripCount),
    tripCount,
    totalKm,
    customersServed,
    routesUsed,
    vehiclesUsed,
  };
}

export function buildAnalyticalTable(
  totalRevenue: number,
  costs: OperationalDreCosts,
  operatingProfit: number | null,
  costsOnlyMode = false,
): OperationalDreAnalyticalRow[] {
  const costRows: Array<{
    category: OperationalDreAnalyticalRow['category'];
    value: number;
  }> = [
    {category: DRE_COST_BUCKET_TO_ANALYTICAL.fuel, value: costs.fuel},
    {category: DRE_COST_BUCKET_TO_ANALYTICAL.maintenance, value: costs.maintenance},
    {category: DRE_COST_BUCKET_TO_ANALYTICAL.tires, value: costs.tires},
    {category: DRE_COST_BUCKET_TO_ANALYTICAL.financial, value: costs.financial},
    {
      category: DRE_COST_BUCKET_TO_ANALYTICAL.accountsPayable,
      value: costs.accountsPayable,
    },
    {category: DRE_COST_BUCKET_TO_ANALYTICAL.other, value: costs.other},
  ];

  const rows: Array<{
    category: OperationalDreAnalyticalRow['category'];
    value: number;
  }> = costsOnlyMode
    ? costRows
    : [
        {category: 'receita', value: totalRevenue},
        ...costRows,
        {category: 'lucro', value: operatingProfit ?? 0},
      ];

  return rows.map((row) => ({
    category: row.category,
    label: DRE_ANALYTICAL_LABELS[row.category],
    value: row.value,
    percentOfRevenue: costsOnlyMode
      ? null
      : percentOfRevenue(row.value, totalRevenue),
  }));
}

export function summarizeTripDimensions(trips: OperationalDreTripRow[]): {
  tripCount: number;
  totalKm: number;
  customersServed: number;
  routesUsed: number;
  vehiclesUsed: number;
} {
  const customers = new Set<string>();
  const routes = new Set<string>();
  const vehicles = new Set<string>();
  let totalKm = 0;

  for (const trip of trips) {
    totalKm += asFinite(trip.distanceKm);
    if (trip.customerId) customers.add(trip.customerId);
    if (trip.routeId) routes.add(trip.routeId);
    if (trip.vehicleId) vehicles.add(trip.vehicleId);
  }

  return {
    tripCount: trips.length,
    totalKm,
    customersServed: customers.size,
    routesUsed: routes.size,
    vehiclesUsed: vehicles.size,
  };
}

/**
 * Determina se uma despesa entra no escopo dos filtros da DRE,
 * dado o conjunto de viagens já filtradas (T).
 *
 * Delega à regra única em `operational-dre-expense-scope`
 * (competência Audit #7 + dimensional — mesma semântica da query PostgREST).
 */
export function expenseMatchesScope(
  expense: OperationalDreExpenseRow,
  filters: OperationalDreFilters,
  tripIds: Set<string>,
): boolean {
  return expenseMatchesCompetenceScope(expense, filters, tripIds);
}

export function filterExpensesForScope(
  expenses: OperationalDreExpenseRow[],
  filters: OperationalDreFilters,
  trips: OperationalDreTripRow[],
): OperationalDreExpenseRow[] {
  const tripIds = new Set(trips.map((trip) => trip.id));
  return expenses.filter((expense) => expenseMatchesScope(expense, filters, tripIds));
}

const SYSTEM_COST_CENTER_ORDER = [
  'OPERACIONAL',
  'ADMINISTRATIVO',
  'COMERCIAL',
  'RH',
  'TI',
] as const;

/**
 * Agrega custos por centro organizacional para cards, % e ranking da DRE.
 */
export function aggregateCostsByCostCenter(
  expenses: OperationalDreExpenseRow[],
): OperationalDreCostCenterBreakdown {
  const totals = new Map<
    string,
    {costCenterId: string | null; code: string; name: string; value: number}
  >();

  for (const expense of expenses) {
    const amount = asFinite(expense.amount);
    const code = (expense.costCenterCode ?? 'SEM_CENTRO').toUpperCase();
    const key = expense.costCenterId ?? code;
    const existing = totals.get(key);
    if (existing) {
      existing.value += amount;
      continue;
    }
    totals.set(key, {
      costCenterId: expense.costCenterId,
      code,
      name: expense.costCenterName ?? code,
      value: amount,
    });
  }

  const total = Array.from(totals.values()).reduce((sum, row) => sum + row.value, 0);

  const ranking: OperationalDreCostCenterRow[] = Array.from(totals.values())
    .map((row) => ({
      costCenterId: row.costCenterId,
      code: row.code,
      name: row.name,
      value: row.value,
      percent: total > 0 ? (row.value / total) * 100 : null,
    }))
    .sort((a, b) => {
      const ai = SYSTEM_COST_CENTER_ORDER.indexOf(
        a.code as (typeof SYSTEM_COST_CENTER_ORDER)[number],
      );
      const bi = SYSTEM_COST_CENTER_ORDER.indexOf(
        b.code as (typeof SYSTEM_COST_CENTER_ORDER)[number],
      );
      if (ai !== -1 || bi !== -1) {
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      }
      return b.value - a.value;
    });

  const byCode: Record<string, number> = {};
  for (const row of ranking) {
    byCode[row.code] = (byCode[row.code] ?? 0) + row.value;
  }

  return {byCode, ranking, total};
}

/**
 * Consolida a DRE Operacional a partir de linhas já filtradas.
 * Toda regra financeira da DRE vive aqui — componentes só renderizam.
 *
 * Audit #6: com `costCenterId`, modo só custos — frete não é atribuído;
 * lucro/margem ficam null (sem P&L comparável).
 */
export function calculateOperationalDre(
  trips: OperationalDreTripRow[],
  expenses: OperationalDreExpenseRow[],
  filters: OperationalDreFilters = {},
): OperationalDreData {
  const costsOnlyMode = isOperationalDreCostsOnlyMode(filters);
  const scopedExpenses = filterExpensesForScope(expenses, filters, trips);
  const freightRevenue = costsOnlyMode ? 0 : sumFreightRevenue(trips);
  const totalRevenue = freightRevenue;
  const costs = aggregateCosts(scopedExpenses);
  const costCenterBreakdown = aggregateCostsByCostCenter(scopedExpenses);
  const operatingProfit = costsOnlyMode
    ? null
    : totalRevenue - costs.totalOperatingCosts;
  const operatingMarginPercent =
    costsOnlyMode || totalRevenue <= 0 || operatingProfit == null
      ? null
      : (operatingProfit / totalRevenue) * 100;
  const dimensions = summarizeTripDimensions(trips);

  return {
    revenues: {
      freightRevenue,
      totalRevenue,
    },
    costs,
    result: {
      operatingProfit,
      operatingMarginPercent,
    },
    indicators: buildIndicators({
      totalRevenue,
      totalOperatingCosts: costs.totalOperatingCosts,
      operatingProfit,
      costsOnlyMode,
      ...dimensions,
    }),
    analyticalTable: buildAnalyticalTable(
      totalRevenue,
      costs,
      operatingProfit,
      costsOnlyMode,
    ),
    costCenterBreakdown,
    costsOnlyMode,
    filters,
  };
}
