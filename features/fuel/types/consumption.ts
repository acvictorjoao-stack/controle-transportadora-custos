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
 * vehicle. This is the atomic unit the future engine will ratear (allocate)
 * across the trips that fall inside it.
 */
export interface FuelConsumptionPeriod {
  vehicleId: string;
  startFuelRecordId: string | null;
  endFuelRecordId: string;
  startOdometerKm: number | null;
  endOdometerKm: number;
  startFueledAt: string | null;
  endFueledAt: string;
  distanceKm: number | null;
  quantityLiters: number;
  totalAmount: number;
}

/** Estimated consumption allocated to a single trip. */
export interface TripFuelConsumption extends ConsumptionMetrics {
  tripId: string;
  periodId: string | null;
  distanceKm: number | null;
  distanceShare: number | null;
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
