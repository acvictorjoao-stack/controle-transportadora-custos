import {getTripFreightValue} from '@/features/trips/utils/trip-lifecycle';

import type {
  OperationalDreDimensionGroup,
  OperationalDreExpenseRow,
  OperationalDreFilters,
  OperationalDreGroupDimension,
  OperationalDreRouteGroup,
  OperationalDreTripDetailRow,
  OperationalDreTripMetrics,
  OperationalDreTripRow,
} from '../types';
import {formatOperationalDreRouteLabel} from '../utils/route-label';
import {filterExpensesForScope} from './operational-dre-calculator';

export {formatOperationalDreRouteLabel};

export const OPERATIONAL_DRE_UNASSIGNED_DIMENSION_KEY = '__none__';

function asFinite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function guardedRatio(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return numerator / denominator;
}

function marginPercent(profit: number, revenue: number): number | null {
  if (revenue <= 0) return null;
  return (profit / revenue) * 100;
}

function unassignedLabel(dimension: OperationalDreGroupDimension): string {
  switch (dimension) {
    case 'route':
      return 'Sem rota';
    case 'customer':
      return 'Sem cliente';
    case 'vehicle':
      return 'Sem veículo';
    case 'driver':
      return 'Sem motorista';
    case 'cost_center':
      return 'Sem centro de custo';
  }
}

/**
 * Resolve a chave de agrupamento de uma viagem para a dimensão pedida.
 * Preparado para reutilizar o mesmo componente com outras dimensões.
 */
export function resolveTripDimensionKey(
  trip: OperationalDreTripRow | OperationalDreTripDetailRow,
  dimension: OperationalDreGroupDimension,
): string {
  let raw: string | null = null;

  switch (dimension) {
    case 'route':
      raw = trip.routeId;
      break;
    case 'customer':
      raw = trip.customerId;
      break;
    case 'vehicle':
      raw = trip.vehicleId;
      break;
    case 'driver':
      raw = 'driverId' in trip ? (trip.driverId ?? null) : null;
      break;
    case 'cost_center':
      raw = null;
      break;
  }

  return raw && raw.length > 0 ? raw : OPERATIONAL_DRE_UNASSIGNED_DIMENSION_KEY;
}

/**
 * Custo de uma viagem = soma das despesas com `tripId` igual ao id da viagem.
 * Despesas sem viagem não entram no detalhe por rota (não atribuíveis).
 */
export function sumTripCosts(
  tripId: string,
  expenses: OperationalDreExpenseRow[],
): number {
  return expenses.reduce((sum, expense) => {
    if (expense.tripId !== tripId) return sum;
    return sum + asFinite(expense.amount);
  }, 0);
}

export function buildTripMetrics(
  trip: OperationalDreTripRow | OperationalDreTripDetailRow,
  expenses: OperationalDreExpenseRow[],
): OperationalDreTripMetrics {
  const revenue = getTripFreightValue({
    contractedFreightValue: trip.contractedFreightValue,
    actualFreightValue: trip.actualFreightValue,
  });
  const cost = sumTripCosts(trip.id, expenses);
  const profit = revenue - cost;
  const detail = trip as OperationalDreTripDetailRow;

  return {
    id: trip.id,
    date: detail.completedAt ?? null,
    tripNumber: detail.tripNumber ?? trip.id,
    vehicleLabel: detail.vehicleLabel ?? null,
    driverLabel: detail.driverLabel ?? null,
    customerLabel: detail.customerLabel ?? null,
    distanceKm: asFinite(trip.distanceKm),
    revenue,
    cost,
    profit,
    marginPercent: marginPercent(profit, revenue),
  };
}

export interface GroupOperationalDreByDimensionOptions {
  dimension: OperationalDreGroupDimension;
  /** Mapa id → rótulo da dimensão (ex.: rota "São Luís → Imperatriz"). */
  labels?: Map<string, string>;
  /**
   * Quando true, preenche `trips` com métricas.
   * No load agregado deve ser false (lazy load na expansão).
   */
  includeTrips?: boolean;
}

/**
 * Agrupa viagens/despesas da DRE por uma dimensão analítica.
 * Reutiliza o escopo de despesas da DRE (`filterExpensesForScope`).
 * Ordena pelo maior custo total.
 */
export function groupOperationalDreByDimension(
  trips: Array<OperationalDreTripRow | OperationalDreTripDetailRow>,
  expenses: OperationalDreExpenseRow[],
  filters: OperationalDreFilters = {},
  options: GroupOperationalDreByDimensionOptions,
): OperationalDreDimensionGroup[] {
  const {dimension, labels = new Map(), includeTrips = false} = options;
  const scopedExpenses = filterExpensesForScope(expenses, filters, trips);
  const expensesByTrip = new Map<string, OperationalDreExpenseRow[]>();

  for (const expense of scopedExpenses) {
    if (!expense.tripId) continue;
    const list = expensesByTrip.get(expense.tripId) ?? [];
    list.push(expense);
    expensesByTrip.set(expense.tripId, list);
  }

  type Acc = {
    dimensionKey: string;
    label: string;
    tripCount: number;
    totalRevenue: number;
    totalCost: number;
    totalKm: number;
    trips: OperationalDreTripMetrics[];
  };

  const groups = new Map<string, Acc>();

  for (const trip of trips) {
    const dimensionKey = resolveTripDimensionKey(trip, dimension);
    const tripExpenses = expensesByTrip.get(trip.id) ?? [];
    const metrics = buildTripMetrics(trip, tripExpenses);
    const existing = groups.get(dimensionKey);

    if (existing) {
      existing.tripCount += 1;
      existing.totalRevenue += metrics.revenue;
      existing.totalCost += metrics.cost;
      existing.totalKm += metrics.distanceKm;
      if (includeTrips) existing.trips.push(metrics);
      continue;
    }

    const label =
      dimensionKey === OPERATIONAL_DRE_UNASSIGNED_DIMENSION_KEY
        ? unassignedLabel(dimension)
        : (labels.get(dimensionKey) ?? unassignedLabel(dimension));

    groups.set(dimensionKey, {
      dimensionKey,
      label,
      tripCount: 1,
      totalRevenue: metrics.revenue,
      totalCost: metrics.cost,
      totalKm: metrics.distanceKm,
      trips: includeTrips ? [metrics] : [],
    });
  }

  const result: OperationalDreDimensionGroup[] = Array.from(groups.values()).map(
    (group) => {
      const totalProfit = group.totalRevenue - group.totalCost;
      return {
        dimensionKey: group.dimensionKey,
        dimensionType: dimension,
        label: group.label,
        tripCount: group.tripCount,
        totalRevenue: group.totalRevenue,
        totalCost: group.totalCost,
        totalProfit,
        marginPercent: marginPercent(totalProfit, group.totalRevenue),
        totalKm: group.totalKm,
        costPerKm: guardedRatio(group.totalCost, group.totalKm),
        revenuePerKm: guardedRatio(group.totalRevenue, group.totalKm),
        trips: includeTrips
          ? group.trips.sort((a, b) => {
              const aDate = a.date ?? '';
              const bDate = b.date ?? '';
              return aDate.localeCompare(bDate);
            })
          : [],
      };
    },
  );

  return result.sort((a, b) => b.totalCost - a.totalCost);
}

/**
 * Consolida custos por rota a partir das mesmas linhas da DRE.
 * `trips` permanece vazio — detalhe via lazy load.
 */
export function calculateOperationalDreByRoute(
  trips: OperationalDreTripRow[],
  expenses: OperationalDreExpenseRow[],
  filters: OperationalDreFilters = {},
  routeLabels: Map<string, string> = new Map(),
): OperationalDreRouteGroup[] {
  return groupOperationalDreByDimension(trips, expenses, filters, {
    dimension: 'route',
    labels: routeLabels,
    includeTrips: false,
  }).map((group) => ({
    ...group,
    dimensionType: 'route' as const,
    route: {
      id:
        group.dimensionKey === OPERATIONAL_DRE_UNASSIGNED_DIMENSION_KEY
          ? null
          : group.dimensionKey,
      label: group.label,
    },
  }));
}

/**
 * Detalha viagens de um único grupo (rota), com métricas por viagem.
 */
export function calculateOperationalDreRouteTrips(
  trips: Array<OperationalDreTripRow | OperationalDreTripDetailRow>,
  expenses: OperationalDreExpenseRow[],
  filters: OperationalDreFilters = {},
): OperationalDreTripMetrics[] {
  const groups = groupOperationalDreByDimension(trips, expenses, filters, {
    dimension: 'route',
    includeTrips: true,
  });

  return groups.flatMap((group) => group.trips);
}
