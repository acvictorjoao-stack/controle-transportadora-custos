import type {SupabaseClient} from '@supabase/supabase-js';

import type {
  ConsumptionAllocationResult,
  FleetConsumptionSummary,
  MonthlyConsumptionPoint,
  MonthlyConsumptionSeriesOptions,
  VehicleConsumptionSummary,
} from '../../types';
import {calculateVehicleConsumptionAllocations} from './consumption-engine';

/**
 * Consumption read-model service (RC 26.6.5).
 *
 * This module is the sole domain aggregation layer for consumption data
 * consumed by dashboards and other interfaces. It operates exclusively on
 * `ConsumptionAllocationResult`s produced by the Consumption Engine — it
 * never imports queries or performs database reads itself.
 *
 * The exported pure aggregators are also the canonical place for future
 * read models to reuse summary logic without duplicating calculation rules.
 */

interface ConsumptionTotals {
  distanceKm: number;
  liters: number;
  fuelCost: number;
}

function emptyTotals(): ConsumptionTotals {
  return {distanceKm: 0, liters: 0, fuelCost: 0};
}

function sumTotals(totals: ConsumptionTotals, addition: ConsumptionTotals): ConsumptionTotals {
  return {
    distanceKm: totals.distanceKm + addition.distanceKm,
    liters: totals.liters + addition.liters,
    fuelCost: totals.fuelCost + addition.fuelCost,
  };
}

function calculateKmPerLiter(distanceKm: number, liters: number): number | null {
  return liters > 0 ? distanceKm / liters : null;
}

function calculateCostPerKm(distanceKm: number, fuelCost: number): number | null {
  return distanceKm > 0 ? fuelCost / distanceKm : null;
}

function summarizeTripAllocations(allocation: ConsumptionAllocationResult): ConsumptionTotals {
  return allocation.tripAllocations.reduce(
    (totals, trip) =>
      sumTotals(totals, {
        distanceKm: trip.distanceKm,
        liters: trip.litersAllocated,
        fuelCost: trip.costAllocated,
      }),
    emptyTotals(),
  );
}

function summarizeOperationalAllocation(allocation: ConsumptionAllocationResult): ConsumptionTotals {
  const operational = allocation.operationalConsumption;

  return operational
    ? {
        distanceKm: operational.distanceKm,
        liters: operational.litersAllocated,
        fuelCost: operational.costAllocated,
      }
    : emptyTotals();
}

/**
 * Reduces a vehicle's existing consumption allocations into a UI-ready read
 * model. Metrics are weighted by the consolidated totals, never averaged
 * from per-period rates.
 */
export function summarizeVehicleConsumption(
  vehicleId: string,
  allocations: ConsumptionAllocationResult[],
): VehicleConsumptionSummary {
  let totals = emptyTotals();
  let tripTotals = emptyTotals();
  let operationalTotals = emptyTotals();

  for (const allocation of allocations) {
    totals = sumTotals(totals, {
      distanceKm: allocation.period.distanceKm,
      liters: allocation.period.litersConsumed,
      fuelCost: allocation.period.fuelCost,
    });
    tripTotals = sumTotals(tripTotals, summarizeTripAllocations(allocation));
    operationalTotals = sumTotals(operationalTotals, summarizeOperationalAllocation(allocation));
  }

  return {
    vehicleId,
    totalDistanceKm: totals.distanceKm,
    totalLiters: totals.liters,
    totalFuelCost: totals.fuelCost,
    averageKmPerLiter: calculateKmPerLiter(totals.distanceKm, totals.liters),
    averageCostPerKm: calculateCostPerKm(totals.distanceKm, totals.fuelCost),
    operationalDistanceKm: operationalTotals.distanceKm,
    operationalLiters: operationalTotals.liters,
    operationalFuelCost: operationalTotals.fuelCost,
    tripDistanceKm: tripTotals.distanceKm,
    tripLiters: tripTotals.liters,
    tripFuelCost: tripTotals.fuelCost,
    periodCount: allocations.length,
  };
}

/**
 * Reduces vehicle summaries into a fleet read model. Vehicles with no
 * consumption periods are excluded from `totalVehicles` so empty histories
 * do not distort fleet KPIs.
 */
export function summarizeFleetConsumption(
  vehicleSummaries: VehicleConsumptionSummary[],
): FleetConsumptionSummary {
  const summariesWithPeriods = vehicleSummaries.filter((summary) => summary.periodCount > 0);
  const totals = summariesWithPeriods.reduce(
    (current, summary) =>
      sumTotals(current, {
        distanceKm: summary.totalDistanceKm,
        liters: summary.totalLiters,
        fuelCost: summary.totalFuelCost,
      }),
    emptyTotals(),
  );
  const operationalTotals = summariesWithPeriods.reduce(
    (current, summary) =>
      sumTotals(current, {
        distanceKm: summary.operationalDistanceKm,
        liters: summary.operationalLiters,
        fuelCost: summary.operationalFuelCost,
      }),
    emptyTotals(),
  );

  return {
    totalVehicles: summariesWithPeriods.length,
    totalDistanceKm: totals.distanceKm,
    totalLiters: totals.liters,
    totalFuelCost: totals.fuelCost,
    averageKmPerLiter: calculateKmPerLiter(totals.distanceKm, totals.liters),
    averageCostPerKm: calculateCostPerKm(totals.distanceKm, totals.fuelCost),
    operationalDistanceKm: operationalTotals.distanceKm,
    operationalFuelCost: operationalTotals.fuelCost,
  };
}

/**
 * Builds a chronological monthly series from existing period allocations.
 * Each period is attributed in full to the `YYYY-MM` of `period.periodEnd`,
 * the closing fill that already owns its liters and cost. Periods are never
 * prorated across months.
 */
export function buildMonthlyConsumptionSeries(
  allocations: ConsumptionAllocationResult[],
  options: MonthlyConsumptionSeriesOptions = {},
): MonthlyConsumptionPoint[] {
  const totalsByMonth = new Map<string, ConsumptionTotals>();

  for (const allocation of allocations) {
    const month = allocation.period.periodEnd.slice(0, 7);

    if ((options.fromMonth && month < options.fromMonth) || (options.toMonth && month > options.toMonth)) {
      continue;
    }

    const current = totalsByMonth.get(month) ?? emptyTotals();
    totalsByMonth.set(
      month,
      sumTotals(current, {
        distanceKm: allocation.period.distanceKm,
        liters: allocation.period.litersConsumed,
        fuelCost: allocation.period.fuelCost,
      }),
    );
  }

  return [...totalsByMonth.entries()]
    .sort(([leftMonth], [rightMonth]) => leftMonth.localeCompare(rightMonth))
    .map(([month, totals]) => ({
      month,
      distanceKm: totals.distanceKm,
      liters: totals.liters,
      fuelCost: totals.fuelCost,
      kmPerLiter: calculateKmPerLiter(totals.distanceKm, totals.liters),
      costPerKm: calculateCostPerKm(totals.distanceKm, totals.fuelCost),
    }));
}

/** Gets the engine allocations for one vehicle and returns its read model. */
export async function getVehicleConsumptionSummary(
  supabase: SupabaseClient,
  companyId: string,
  vehicleId: string,
): Promise<VehicleConsumptionSummary> {
  const allocations = await calculateVehicleConsumptionAllocations(supabase, companyId, vehicleId);

  return summarizeVehicleConsumption(vehicleId, allocations);
}

/**
 * Gets summaries for the caller-supplied fleet vehicle IDs and consolidates
 * them. Fleet membership is intentionally resolved outside this service so
 * this layer never reads the database directly.
 */
export async function getFleetConsumptionSummary(
  supabase: SupabaseClient,
  companyId: string,
  vehicleIds: string[],
): Promise<FleetConsumptionSummary> {
  const vehicleSummaries = await Promise.all(
    vehicleIds.map((vehicleId) => getVehicleConsumptionSummary(supabase, companyId, vehicleId)),
  );

  return summarizeFleetConsumption(vehicleSummaries);
}

/** Gets the engine allocations for one vehicle and returns its monthly read model. */
export async function getMonthlyConsumptionSeries(
  supabase: SupabaseClient,
  companyId: string,
  vehicleId: string,
  options?: MonthlyConsumptionSeriesOptions,
): Promise<MonthlyConsumptionPoint[]> {
  const allocations = await calculateVehicleConsumptionAllocations(supabase, companyId, vehicleId);

  return buildMonthlyConsumptionSeries(allocations, options);
}
