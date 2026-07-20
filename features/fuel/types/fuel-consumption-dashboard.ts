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

/**
 * A single vehicle highlighted by the executive indicators (best/worst
 * efficiency, highest/lowest cost). `value` is copied verbatim from the
 * corresponding `VehicleConsumptionSummary` field — never recomputed.
 */
export interface FuelExecutiveVehicleHighlight {
  vehicleId: string;
  plate: string;
  value: number;
}

/**
 * Executive KPIs for the Fuel Consumption Dashboard (RC 26.6.7). Every
 * highlight is an extreme picked from the already-computed
 * `FuelConsumptionVehicleRow[]` — no rate is recalculated here.
 * `operationalConsumptionPercentage` is the only derived value, a guarded
 * share of two totals `FleetConsumptionSummary` already exposes
 * (`operationalDistanceKm` / `totalDistanceKm`), using the same
 * guarded-division primitive the loader already applies for `kmPerLiter`/
 * `costPerKm`.
 */
export interface FuelExecutiveIndicators {
  bestEfficiencyVehicle: FuelExecutiveVehicleHighlight | null;
  worstEfficiencyVehicle: FuelExecutiveVehicleHighlight | null;
  highestCostVehicle: FuelExecutiveVehicleHighlight | null;
  lowestCostVehicle: FuelExecutiveVehicleHighlight | null;
  operationalConsumptionPercentage: number | null;
}

/**
 * One row of the "Eficiência dos veículos" ranking: a
 * `FuelConsumptionVehicleRow` enriched with its 1-based `position` (sorted
 * by `averageKmPerLiter` descending) and its `operationalPercentage` — a
 * guarded share of `operationalDistanceKm` / `totalDistanceKm`. Both fields
 * are ranking/composition metadata, never a recalculated rate.
 */
export interface FuelVehicleRankingRow extends FuelConsumptionVehicleRow {
  position: number;
  operationalPercentage: number | null;
}

/**
 * Smart alerts surfaced by the Fuel Consumption Dashboard (RC 26.6.7). Each
 * variant only carries values already produced by `ConsumptionSummary` plus
 * the guarded share/gap derived from them — the view only renders the
 * message, it never computes the underlying numbers.
 */
export type FuelConsumptionAlert =
  | {
      type: 'below_average';
      vehicleId: string;
      plate: string;
      kmPerLiter: number;
      gapPercentage: number;
    }
  | {
      type: 'high_operational';
      vehicleId: string;
      plate: string;
      operationalPercentage: number;
    }
  | {
      type: 'no_consumption';
      vehicleId: string;
      plate: string;
    };

/** Aggregate payload consumed exclusively by the Fuel Consumption Dashboard view. */
export interface FuelConsumptionDashboardData {
  fleet: FuelConsumptionFleetSummary;
  vehicles: FuelConsumptionVehicleRow[];
  monthly: MonthlyConsumptionPoint[];
  executive: FuelExecutiveIndicators;
  ranking: FuelVehicleRankingRow[];
  alerts: FuelConsumptionAlert[];
}
