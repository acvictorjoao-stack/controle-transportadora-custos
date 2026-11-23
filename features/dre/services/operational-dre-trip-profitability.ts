/**
 * Fase 2.2.3 — Rentabilidade por viagem (sem I/O).
 *
 * Não há cálculo novo: cada valor vem do motor da DRE.
 * - Custo direto = `sumTripCosts` (mesmo critério da view trip_financial_summary).
 * - Custo com rateio = `buildTripCostByIdMap` (direto + parte rateada por KM do
 *   veículo), o mesmo dos rankings por veículo/rota/cliente/motorista.
 * - Escopo das despesas = `filterExpensesForScope`, como na DRE.
 */

import type {TripDistanceSource} from '@/features/trips/utils/trip-distance';
import {getTripFreightValue} from '@/features/trips/utils/trip-lifecycle';

import type {
  OperationalDreExpenseRow,
  OperationalDreFilters,
  OperationalDreTripDetailRow,
  OperationalDreTripRow,
} from '../types';
import {isOperationalDreCostsOnlyMode} from './operational-dre-costs-only';
import {filterExpensesForScope} from './operational-dre-calculator';
import {buildTripCostByIdMap, sumTripCosts} from './operational-dre-by-dimension';

export type {TripDistanceSource};

export interface TripProfitabilityRow {
  id: string;
  tripNumber: string;
  completedAt: string | null;
  vehicleLabel: string | null;
  driverLabel: string | null;
  customerLabel: string | null;
  routeLabel: string | null;
  distanceKm: number;
  distanceSource: TripDistanceSource;
  revenue: number;
  directCost: number;
  /** Direto + parte rateada dos custos do veículo sem viagem. */
  allocatedCost: number;
  /** Parte rateada (allocatedCost − directCost). */
  vehicleShare: number;
  /** Null no modo só custos (filtro de centro de custo). */
  directResult: number | null;
  allocatedResult: number | null;
  directMarginPercent: number | null;
  allocatedMarginPercent: number | null;
  costPerKm: number | null;
  profitPerKm: number | null;
}

export interface TripProfitabilitySummary {
  tripCount: number;
  revenue: number;
  directCost: number;
  allocatedCost: number;
  directResult: number | null;
  allocatedResult: number | null;
  allocatedMarginPercent: number | null;
  totalKm: number;
  profitPerKm: number | null;
  /** Qualidade do KM: quantas viagens têm odômetro, só planejado ou nenhum KM. */
  kmQuality: Record<TripDistanceSource, number>;
}

export interface TripProfitabilityInput {
  trips: Array<OperationalDreTripRow | OperationalDreTripDetailRow>;
  expenses: OperationalDreExpenseRow[];
  filters?: OperationalDreFilters;
  /** Base de KM do rateio: viagens dos veículos no período (independe de rota/cliente). */
  allocationBaseTrips?: OperationalDreTripRow[];
  /** Custos sem viagem dos veículos, para o rateio. */
  unlinkedVehicleExpenses?: OperationalDreExpenseRow[];
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function ratio(numerator: number | null, denominator: number): number | null {
  if (numerator === null || !Number.isFinite(numerator) || denominator <= 0) return null;
  return numerator / denominator;
}

function margin(result: number | null, revenue: number): number | null {
  return result === null || revenue <= 0 ? null : (result / revenue) * 100;
}

export function buildTripProfitabilityRows(input: TripProfitabilityInput): TripProfitabilityRow[] {
  const filters = input.filters ?? {};
  const costsOnlyMode = isOperationalDreCostsOnlyMode(filters);
  const scopedExpenses = filterExpensesForScope(input.expenses, filters, input.trips);
  const byId = new Map<string, OperationalDreExpenseRow>();
  for (const expense of [...scopedExpenses, ...(input.unlinkedVehicleExpenses ?? [])]) {
    byId.set(expense.id, expense);
  }
  const allocationExpenses = Array.from(byId.values());
  const allocatedByTrip = buildTripCostByIdMap(allocationExpenses, input.allocationBaseTrips ?? input.trips);

  return input.trips.map((trip) => {
    const detail = trip as OperationalDreTripDetailRow;
    const revenue = costsOnlyMode
      ? 0
      : getTripFreightValue({
          contractedFreightValue: trip.contractedFreightValue,
          actualFreightValue: trip.actualFreightValue,
        });
    // Valores exatos por viagem (a tela formata); só o resumo arredonda, uma vez,
    // para a soma bater com a DRE e os rankings (arredondar por linha somava centavos).
    const directCost = sumTripCosts(trip.id, scopedExpenses);
    const allocatedCost = allocatedByTrip.get(trip.id) ?? 0;
    const directResult = costsOnlyMode ? null : revenue - directCost;
    const allocatedResult = costsOnlyMode ? null : revenue - allocatedCost;
    const distanceKm = Number.isFinite(trip.distanceKm) ? trip.distanceKm : 0;
    return {
      id: trip.id,
      tripNumber: detail.tripNumber ?? trip.id,
      completedAt: detail.completedAt ?? null,
      vehicleLabel: detail.vehicleLabel ?? null,
      driverLabel: detail.driverLabel ?? null,
      customerLabel: detail.customerLabel ?? null,
      routeLabel: detail.routeLabel ?? null,
      distanceKm,
      distanceSource: trip.distanceSource ?? (distanceKm > 0 ? 'odometer' : 'none'),
      revenue,
      directCost,
      allocatedCost,
      vehicleShare: allocatedCost - directCost,
      directResult,
      allocatedResult,
      directMarginPercent: margin(directResult, revenue),
      allocatedMarginPercent: margin(allocatedResult, revenue),
      costPerKm: ratio(allocatedCost, distanceKm),
      profitPerKm: ratio(allocatedResult, distanceKm),
    };
  });
}

export function summarizeTripProfitability(rows: readonly TripProfitabilityRow[]): TripProfitabilitySummary {
  const costsOnlyMode = rows.length > 0 && rows.every((row) => row.allocatedResult === null);
  const sum = (pick: (row: TripProfitabilityRow) => number) => round2(rows.reduce((total, row) => total + pick(row), 0));
  const revenue = sum((row) => row.revenue);
  const allocatedCost = sum((row) => row.allocatedCost);
  const directCost = sum((row) => row.directCost);
  const totalKm = sum((row) => row.distanceKm);
  const allocatedResult = costsOnlyMode ? null : round2(revenue - allocatedCost);
  const kmQuality: Record<TripDistanceSource, number> = {odometer: 0, planned: 0, none: 0};
  for (const row of rows) kmQuality[row.distanceSource] += 1;
  return {
    tripCount: rows.length,
    revenue,
    directCost,
    allocatedCost,
    directResult: costsOnlyMode ? null : round2(revenue - directCost),
    allocatedResult,
    allocatedMarginPercent: margin(allocatedResult, revenue),
    totalKm,
    profitPerKm: ratio(allocatedResult, totalKm),
    kmQuality,
  };
}

export type TripProfitabilitySort = 'result_desc' | 'result_asc' | 'margin_desc' | 'margin_asc' | 'date_desc';

/** Ordenação do ranking; empates pelo número da viagem. Valores nulos vão para o fim. */
export function sortTripProfitabilityRows(
  rows: readonly TripProfitabilityRow[],
  sort: TripProfitabilitySort,
): TripProfitabilityRow[] {
  const value = (row: TripProfitabilityRow): number | null => {
    switch (sort) {
      case 'result_desc':
      case 'result_asc':
        return row.allocatedResult;
      case 'margin_desc':
      case 'margin_asc':
        return row.allocatedMarginPercent;
      case 'date_desc':
        return row.completedAt ? Date.parse(row.completedAt) : null;
    }
  };
  const direction = sort.endsWith('_asc') ? 1 : -1;
  return [...rows].sort((a, b) => {
    const left = value(a);
    const right = value(b);
    if (left === null && right === null) return a.tripNumber.localeCompare(b.tripNumber);
    if (left === null) return 1;
    if (right === null) return -1;
    return (left - right) * direction || a.tripNumber.localeCompare(b.tripNumber);
  });
}
