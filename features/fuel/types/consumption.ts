/**
 * Types for the future Fuel Consumption Engine (RC 26.6.x).
 *
 * These shapes describe estimated fuel consumption derived from the sequence
 * of a vehicle's odometer readings, fuel records and completed trips. No
 * calculation is performed against them yet — see
 * `features/fuel/services/consumption/consumption-engine.ts`.
 */

/** Common estimated-metrics shape shared by every consumption entity. */
export interface ConsumptionMetrics {
  estimatedLiters: number | null;
  estimatedCost: number | null;
  kmPerLiter: number | null;
  costPerKm: number | null;
  consumptionPercentage: number | null;
}

/** Wraps a computed metrics object with provenance/traceability metadata. */
export interface ConsumptionResult<TMetrics = ConsumptionMetrics> {
  metrics: TMetrics;
  isEstimated: true;
  calculatedAt: string;
  sourcePeriodIds: string[];
}

/**
 * The odometer window between two consecutive fuel records of the same
 * vehicle. Consumption is attributed to the period's most recent
 * (`end`) fuel record, since it represents the replenishment of the fuel
 * consumed while covering `distanceKm`.
 *
 * This is the atomic unit that future RCs will use for:
 *   - rateio (proportional allocation) of liters/cost across the trips
 *     that fall inside the period's odometer window;
 *   - route, client and driver consumption indicators, derived from the
 *     trip-level allocations above.
 *
 * Only valid periods are ever constructed (see `calculateConsumptionPeriod`
 * in `features/fuel/services/consumption/consumption-engine.ts`), so every
 * field here is guaranteed to be present and numerically meaningful.
 */
export interface FuelConsumptionPeriod {
  vehicleId: string;
  startFuelRecordId: string;
  endFuelRecordId: string;
  startOdometer: number;
  endOdometer: number;
  distanceKm: number;
  litersConsumed: number;
  fuelCost: number;
  pricePerLiter: number;
  kmPerLiter: number;
  costPerKm: number;
  periodStart: string;
  periodEnd: string;
}

/** Estimated consumption allocated to a single trip. */
export interface TripFuelConsumption extends ConsumptionMetrics {
  tripId: string;
  periodId: string | null;
  distanceKm: number | null;
  distanceShare: number | null;
}

/**
 * A contiguous odometer range inside a `FuelConsumptionPeriod` that is not
 * covered by any completed trip (see `OperationalConsumptionAllocation`).
 */
export interface OperationalConsumptionSegment {
  startOdometer: number;
  endOdometer: number;
  distanceKm: number;
}

/**
 * The rateio (proportional allocation) of one `FuelConsumptionPeriod`'s
 * liters/cost to a single completed trip whose odometer range overlaps that
 * period (RC 26.6.3).
 *
 * When a trip's range only partially overlaps the period (e.g. the vehicle
 * was refueled mid-trip), `overlapStartOdometer`/`overlapEndOdometer`/
 * `distanceKm` refer only to the intersection with this period — the rest of
 * the trip is allocated by the adjacent period(s). This is what guarantees
 * that allocations never duplicate or lose kilometers/liters/currency.
 */
export interface TripConsumptionAllocation extends ConsumptionMetrics {
  tripId: string;
  periodId: string;
  vehicleId: string;
  overlapStartOdometer: number;
  overlapEndOdometer: number;
  distanceKm: number;
  distanceSharePercentage: number;
  litersAllocated: number;
  costAllocated: number;
}

/**
 * The rateio of a `FuelConsumptionPeriod`'s liters/cost attributed to
 * "Consumo Operacional" — the portion of the period's odometer range that
 * is **not** covered by any completed trip (RC 26.6.3).
 *
 * Operational consumption represents vehicle movement that is not linked to
 * any trip, such as:
 *   - deslocamento até a oficina (workshop trips);
 *   - lavagem (washing);
 *   - teste (test drives);
 *   - movimentação interna no pátio (internal yard movement);
 *   - reposicionamento do veículo (repositioning between locations).
 *
 * These kilometers must never be attributed to a trip. This allocation is a
 * purely logical/in-memory object produced by the engine — it is **never**
 * persisted to the database.
 */
export interface OperationalConsumptionAllocation extends ConsumptionMetrics {
  type: 'operational_consumption';
  periodId: string;
  vehicleId: string;
  distanceKm: number;
  distanceSharePercentage: number;
  litersAllocated: number;
  costAllocated: number;
  segments: OperationalConsumptionSegment[];
}

/**
 * The full rateio of a single `FuelConsumptionPeriod`: every completed trip
 * that overlaps it, plus the aggregated operational consumption for any
 * leftover kilometers (RC 26.6.3).
 *
 * Integrity guarantee: `totalAllocatedLiters` equals `period.litersConsumed`
 * and `totalAllocatedCost` equals `period.fuelCost` to full floating-point
 * precision — no liter or currency unit is ever created or lost, and no
 * internal rounding is ever applied.
 */
export interface ConsumptionAllocationResult {
  period: FuelConsumptionPeriod;
  tripAllocations: TripConsumptionAllocation[];
  operationalConsumption: OperationalConsumptionAllocation | null;
  totalAllocatedLiters: number;
  totalAllocatedCost: number;
}

/**
 * Read model of all consumption allocations for one vehicle. Its totals and
 * split metrics are derived exclusively from `ConsumptionAllocationResult`s,
 * so consumers never need to reproduce domain calculations in the UI.
 */
export interface VehicleConsumptionSummary {
  vehicleId: string;
  totalDistanceKm: number;
  totalLiters: number;
  totalFuelCost: number;
  averageKmPerLiter: number | null;
  averageCostPerKm: number | null;
  operationalDistanceKm: number;
  operationalLiters: number;
  operationalFuelCost: number;
  tripDistanceKm: number;
  tripLiters: number;
  tripFuelCost: number;
  periodCount: number;
}

/**
 * Read model that rolls up the consumption summaries of vehicles with at
 * least one valid consumption period. The operational split intentionally
 * follows the RC 26.6.5 contract, which exposes distance and fuel cost.
 */
export interface FleetConsumptionSummary {
  totalVehicles: number;
  totalDistanceKm: number;
  totalLiters: number;
  totalFuelCost: number;
  averageKmPerLiter: number | null;
  averageCostPerKm: number | null;
  operationalDistanceKm: number;
  operationalFuelCost: number;
}

/** A whole-period consumption bucket attributed to its closing fuel-record month. */
export interface MonthlyConsumptionPoint {
  month: string;
  distanceKm: number;
  liters: number;
  fuelCost: number;
  kmPerLiter: number | null;
  costPerKm: number | null;
}

/** Optional inclusive `YYYY-MM` bounds for a monthly consumption series. */
export interface MonthlyConsumptionSeriesOptions {
  fromMonth?: string;
  toMonth?: string;
}

/** Aggregated estimated consumption for a vehicle across all its periods. */
export interface VehicleConsumption extends ConsumptionMetrics {
  vehicleId: string;
  totalLiters: number | null;
  totalAmount: number | null;
  periodCount: number;
}

/** Aggregated estimated consumption for a route across its trips. */
export interface RouteConsumption extends ConsumptionMetrics {
  routeId: string;
  tripCount: number;
}

/** Aggregated estimated consumption for a driver across their trips. */
export interface DriverConsumption extends ConsumptionMetrics {
  driverId: string;
  tripCount: number;
}

/** Aggregated estimated consumption for a customer across their trips. */
export interface ClientConsumption extends ConsumptionMetrics {
  customerId: string;
  tripCount: number;
}
