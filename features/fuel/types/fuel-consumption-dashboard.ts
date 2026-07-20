import type {FleetConsumptionSummary, MonthlyConsumptionPoint, VehicleConsumptionSummary} from './consumption';

/**
 * UI-facing filters for the Fuel Consumption Dashboard (RC 26.6.6).
 *
 * Filters only ever narrow the caller-supplied `vehicleIds` and the
 * `fromMonth`/`toMonth` window passed to `ConsumptionSummary` — they never
 * carry computed values.
 */
export interface FuelConsumptionDashboardFilters {
  vehicleIds?: string[];
  branchId?: string;
  fromMonth?: string;
  toMonth?: string;
}

/**
 * `FleetConsumptionSummary` plus the two fields that RC 26.6.5 intentionally
 * left out of the fleet read model (`operationalLiters`, `periodCount`).
 * Both are plain sums of the same `VehicleConsumptionSummary[]` already
 * fetched for the vehicle table — never a recalculated rate or average.
 */
export interface FuelConsumptionFleetSummary extends FleetConsumptionSummary {
  operationalLiters: number;
  periodCount: number;
}

/** One vehicle-table row: a `VehicleConsumptionSummary` enriched with display-only identity fields. */
export interface FuelConsumptionVehicleRow extends VehicleConsumptionSummary {
  plate: string;
  model: string | null;
}

/** Aggregate payload consumed exclusively by the Fuel Consumption Dashboard view. */
export interface FuelConsumptionDashboardData {
  fleet: FuelConsumptionFleetSummary;
  vehicles: FuelConsumptionVehicleRow[];
  monthly: MonthlyConsumptionPoint[];
}
