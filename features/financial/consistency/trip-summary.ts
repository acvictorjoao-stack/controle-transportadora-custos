/**
 * Fase 1, Etapa 1 — resumo financeiro da viagem e invariante I1.
 *
 * `computeTripFinancialSummaries` é o espelho em TypeScript da view
 * `trip_financial_summary` (migration 110). Serve para os testes e para o
 * diagnóstico prever o que a tela vai mostrar antes de a migration existir.
 * Os grupos usam `categorizeExpense` da DRE: se a view divergir dessa regra, a
 * invariante I1 (com as linhas reais da view) acusa.
 */
import {categorizeExpense} from '@/features/dre/services/operational-dre-calculator';
import type {OperationalDreExpenseRow} from '@/features/dre/types';

import {
  isDreTripCost,
  roundMoney,
  runFase1Invariants,
  toNumber,
  tripFreight,
  type CategoryRow,
  type FinancialEntryRow,
  type InvariantResult,
  type MovementRow,
  type TripExpenseRow,
  type TripRow,
} from './fase1-consistency';

/** Colunas de `trip_financial_summary` usadas nas invariantes. */
export interface TripSummaryRow {
  trip_id: string;
  trip_number: string | null;
  freight_amount: number | string;
  direct_costs: number | string;
  fuel_costs: number | string;
  maintenance_costs: number | string;
  tire_costs: number | string;
  other_costs: number | string;
  result: number | string;
  advances_total: number | string;
  unposted_trip_expenses_amount: number | string;
  unposted_trip_expenses_count: number;
}

function toDreRow(entry: FinancialEntryRow, slugById: Map<string, string>): OperationalDreExpenseRow {
  return {
    id: entry.id,
    amount: toNumber(entry.amount),
    branchId: null,
    customerId: null,
    tripId: entry.trip_id,
    vehicleId: null,
    driverId: null,
    sourceModule: entry.source_module,
    categorySlug: entry.category_id ? (slugById.get(entry.category_id) ?? null) : null,
    fuelRecordId: entry.fuel_record_id,
    maintenanceRecordId: entry.maintenance_record_id,
    tireId: entry.tire_id,
    costCenterId: null,
    costCenterCode: null,
    costCenterName: null,
  };
}

interface DreTripCosts {
  total: number;
  fuel: number;
  maintenance: number;
  tires: number;
}

/** Custo que a DRE vincula a cada viagem, por grupo. */
export function dreCostsByTrip(
  entries: FinancialEntryRow[],
  categories: CategoryRow[],
): Map<string, DreTripCosts> {
  const slugById = new Map(categories.map((category) => [category.id, category.slug]));
  const byTrip = new Map<string, DreTripCosts>();
  for (const entry of entries) {
    if (!isDreTripCost(entry) || !entry.trip_id) continue;
    const costs = byTrip.get(entry.trip_id) ?? {total: 0, fuel: 0, maintenance: 0, tires: 0};
    const amount = toNumber(entry.amount);
    costs.total += amount;
    const bucket = categorizeExpense(toDreRow(entry, slugById));
    if (bucket === 'fuel') costs.fuel += amount;
    if (bucket === 'maintenance') costs.maintenance += amount;
    if (bucket === 'tires') costs.tires += amount;
    byTrip.set(entry.trip_id, costs);
  }
  return byTrip;
}

function isActivePosting(entry: FinancialEntryRow): boolean {
  return (
    entry.deleted_at === null &&
    entry.entry_status !== 'cancelled' &&
    entry.entry_status !== 'reversed' &&
    entry.entry_type !== 'reversal'
  );
}

/** Espelho da view `trip_financial_summary`. */
export function computeTripFinancialSummaries(input: {
  trips: TripRow[];
  expenses: TripExpenseRow[];
  entries: FinancialEntryRow[];
  categories: CategoryRow[];
}): TripSummaryRow[] {
  const costs = dreCostsByTrip(input.entries, input.categories);
  const posted = new Set(
    input.entries
      .filter((entry) => entry.source_module === 'trip_expense' && entry.source_id && isActivePosting(entry))
      .map((entry) => entry.source_id as string),
  );
  const advances = new Map<string, number>();
  for (const entry of input.entries) {
    if (entry.entry_type !== 'advance' || !entry.trip_id || !isActivePosting(entry)) continue;
    advances.set(entry.trip_id, (advances.get(entry.trip_id) ?? 0) + toNumber(entry.amount));
  }
  const unposted = new Map<string, {amount: number; count: number}>();
  for (const expense of input.expenses) {
    if (expense.deleted_at !== null || expense.expense_type === 'advance' || posted.has(expense.id)) {
      continue;
    }
    const current = unposted.get(expense.trip_id) ?? {amount: 0, count: 0};
    current.amount += toNumber(expense.amount);
    current.count += 1;
    unposted.set(expense.trip_id, current);
  }

  return input.trips
    .filter((trip) => trip.deleted_at === null)
    .map((trip) => {
      const tripCosts = costs.get(trip.id) ?? {total: 0, fuel: 0, maintenance: 0, tires: 0};
      const freight = roundMoney(tripFreight(trip));
      const direct = roundMoney(tripCosts.total);
      const fuel = roundMoney(tripCosts.fuel);
      const maintenance = roundMoney(tripCosts.maintenance);
      const tires = roundMoney(tripCosts.tires);
      return {
        trip_id: trip.id,
        trip_number: trip.trip_number,
        freight_amount: freight,
        direct_costs: direct,
        fuel_costs: fuel,
        maintenance_costs: maintenance,
        tire_costs: tires,
        other_costs: roundMoney(direct - fuel - maintenance - tires),
        result: roundMoney(freight - direct),
        advances_total: roundMoney(advances.get(trip.id) ?? 0),
        unposted_trip_expenses_amount: roundMoney(unposted.get(trip.id)?.amount ?? 0),
        unposted_trip_expenses_count: unposted.get(trip.id)?.count ?? 0,
      };
    });
}

/**
 * I1 (Etapa 1): para cada viagem, o resumo mostra o mesmo frete, o mesmo custo
 * direto (no total e por grupo) e o mesmo resultado que a DRE.
 */
export function checkTripSummaryMatchesDre(input: {
  summaries: TripSummaryRow[];
  trips: TripRow[];
  entries: FinancialEntryRow[];
  categories: CategoryRow[];
}): InvariantResult {
  const costs = dreCostsByTrip(input.entries, input.categories);
  const summaryByTrip = new Map(input.summaries.map((row) => [row.trip_id, row]));
  const violations: string[] = [];

  for (const trip of input.trips) {
    if (trip.deleted_at !== null) continue;
    const label = trip.trip_number ?? trip.id;
    const summary = summaryByTrip.get(trip.id);
    if (!summary) {
      violations.push(`${label}: sem linha no resumo`);
      continue;
    }
    const dre = costs.get(trip.id) ?? {total: 0, fuel: 0, maintenance: 0, tires: 0};
    const freight = roundMoney(tripFreight(trip));
    const pairs: Array<[string, number, number]> = [
      ['frete', roundMoney(toNumber(summary.freight_amount)), freight],
      ['custo direto', roundMoney(toNumber(summary.direct_costs)), roundMoney(dre.total)],
      ['combustível', roundMoney(toNumber(summary.fuel_costs)), roundMoney(dre.fuel)],
      ['manutenção', roundMoney(toNumber(summary.maintenance_costs)), roundMoney(dre.maintenance)],
      ['pneus', roundMoney(toNumber(summary.tire_costs)), roundMoney(dre.tires)],
      ['resultado', roundMoney(toNumber(summary.result)), roundMoney(freight - dre.total)],
    ];
    for (const [name, inSummary, inDre] of pairs) {
      if (inSummary !== inDre) violations.push(`${label}: ${name} resumo ${inSummary} × DRE ${inDre}`);
    }
  }

  return {
    id: 'I1',
    description: 'Resumo da viagem = DRE (frete, custo direto por grupo e resultado)',
    stage: 1,
    violations,
  };
}

/** Todas as invariantes da Fase 1: I1 (Etapa 1) mais as da Etapa 0 em diante. */
export function runAllFase1Invariants(input: {
  trips: TripRow[];
  expenses: TripExpenseRow[];
  entries: FinancialEntryRow[];
  movements: MovementRow[];
  categories: CategoryRow[];
  /** Linhas reais da view; sem elas, usa o espelho em TypeScript. */
  summaries?: TripSummaryRow[];
}): InvariantResult[] {
  const summaries = input.summaries ?? computeTripFinancialSummaries(input);
  return [
    checkTripSummaryMatchesDre({...input, summaries}),
    ...runFase1Invariants(input),
  ];
}
