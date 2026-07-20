import type {SupabaseClient} from '@supabase/supabase-js';

import {listVehiclesForSelect} from '@/features/vehicles/queries';
import type {VehicleSelectOption} from '@/features/vehicles/types';

import {
  getFleetConsumptionSummary,
  getMonthlyConsumptionSeries,
  getVehicleConsumptionSummary,
} from '../services/consumption';
import type {
  FuelConsumptionDashboardData,
  FuelConsumptionDashboardFilters,
  FuelConsumptionVehicleRow,
  MonthlyConsumptionPoint,
  VehicleConsumptionSummary,
} from '../types';
import {
  buildConsumptionAlerts,
  buildExecutiveIndicators,
  buildVehicleRanking,
} from './fuel-consumption-executive';

/**
 * Fuel Consumption Dashboard loader (RC 26.6.6, extended by the Executive
 * Dashboard in RC 26.6.7).
 *
 * This is the ONLY place, outside `ConsumptionSummary` itself, allowed to
 * combine numbers across vehicles. Every value it produces is either:
 *   - copied verbatim from `getFleetConsumptionSummary` /
 *     `getVehicleConsumptionSummary` / `getMonthlyConsumptionSeries`, or
 *   - a plain sum of fields those functions already computed (never an
 *     average, ratio or rate), using the exact same guarded-division
 *     formula `ConsumptionSummary` uses for `kmPerLiter` / `costPerKm`.
 *
 * `executive`, `ranking` and `alerts` (RC 26.6.7, see
 * `fuel-consumption-executive.ts`) are derived exclusively from `fleet` and
 * `vehicles` above — sorting, ranking and extreme-picking, plus the same
 * guarded-division primitive, never a new domain rule.
 *
 * The React layer never touches this arithmetic — it only renders the
 * `FuelConsumptionDashboardData` this loader returns.
 */

function calculateKmPerLiter(distanceKm: number, liters: number): number | null {
  return liters > 0 ? distanceKm / liters : null;
}

function calculateCostPerKm(distanceKm: number, fuelCost: number): number | null {
  return distanceKm > 0 ? fuelCost / distanceKm : null;
}

function emptyDashboardData(): FuelConsumptionDashboardData {
  return {
    fleet: {
      totalVehicles: 0,
      totalDistanceKm: 0,
      totalLiters: 0,
      totalFuelCost: 0,
      averageKmPerLiter: null,
      averageCostPerKm: null,
      operationalDistanceKm: 0,
      operationalFuelCost: 0,
      operationalLiters: 0,
      periodCount: 0,
    },
    vehicles: [],
    monthly: [],
    executive: {
      bestEfficiencyVehicle: null,
      worstEfficiencyVehicle: null,
      highestCostVehicle: null,
      lowestCostVehicle: null,
      operationalConsumptionPercentage: null,
    },
    ranking: [],
    alerts: [],
  };
}

function resolveScopedVehicles(
  allVehicles: VehicleSelectOption[],
  vehicleIds?: string[],
): VehicleSelectOption[] {
  if (!vehicleIds || vehicleIds.length === 0) return allVehicles;
  const scoped = new Set(vehicleIds);
  return allVehicles.filter((vehicle) => scoped.has(vehicle.id));
}

function mergeMonthlySeries(seriesPerVehicle: MonthlyConsumptionPoint[][]): MonthlyConsumptionPoint[] {
  const totalsByMonth = new Map<string, {distanceKm: number; liters: number; fuelCost: number}>();

  for (const series of seriesPerVehicle) {
    for (const point of series) {
      const current = totalsByMonth.get(point.month) ?? {distanceKm: 0, liters: 0, fuelCost: 0};
      totalsByMonth.set(point.month, {
        distanceKm: current.distanceKm + point.distanceKm,
        liters: current.liters + point.liters,
        fuelCost: current.fuelCost + point.fuelCost,
      });
    }
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

function toVehicleRow(
  summary: VehicleConsumptionSummary,
  vehicle: VehicleSelectOption | undefined,
): FuelConsumptionVehicleRow {
  return {
    ...summary,
    plate: vehicle?.plate ?? '—',
    model: vehicle?.model ?? null,
  };
}

/**
 * Composes the Fuel Consumption Dashboard read model for the given company
 * and filters. `vehicleIds` narrows the fleet scope; `fromMonth`/`toMonth`
 * narrow the monthly series window — both are forwarded as-is to
 * `ConsumptionSummary`.
 */
export async function composeFuelConsumptionDashboard(
  supabase: SupabaseClient,
  companyId: string,
  filters: FuelConsumptionDashboardFilters = {},
): Promise<FuelConsumptionDashboardData> {
  const allVehicles = await listVehiclesForSelect(supabase, companyId, 500);
  const scopedVehicles = resolveScopedVehicles(allVehicles, filters.vehicleIds);
  const vehicleIds = scopedVehicles.map((vehicle) => vehicle.id);

  if (vehicleIds.length === 0) {
    return emptyDashboardData();
  }

  const vehicleById = new Map(scopedVehicles.map((vehicle) => [vehicle.id, vehicle]));

  const [fleetSummary, vehicleSummaries, monthlyPerVehicle] = await Promise.all([
    getFleetConsumptionSummary(supabase, companyId, vehicleIds),
    Promise.all(vehicleIds.map((vehicleId) => getVehicleConsumptionSummary(supabase, companyId, vehicleId))),
    Promise.all(
      vehicleIds.map((vehicleId) =>
        getMonthlyConsumptionSeries(supabase, companyId, vehicleId, {
          fromMonth: filters.fromMonth,
          toMonth: filters.toMonth,
        }),
      ),
    ),
  ]);

  const operationalLiters = vehicleSummaries.reduce(
    (total, summary) => total + summary.operationalLiters,
    0,
  );
  const periodCount = vehicleSummaries.reduce((total, summary) => total + summary.periodCount, 0);

  const fleet = {
    ...fleetSummary,
    operationalLiters,
    periodCount,
  };
  const vehicles = vehicleSummaries.map((summary) =>
    toVehicleRow(summary, vehicleById.get(summary.vehicleId)),
  );

  return {
    fleet,
    vehicles,
    monthly: mergeMonthlySeries(monthlyPerVehicle),
    executive: buildExecutiveIndicators(fleet, vehicles),
    ranking: buildVehicleRanking(vehicles),
    alerts: buildConsumptionAlerts(fleet, vehicles),
  };
}
