import type {SupabaseClient} from '@supabase/supabase-js';

import {
  getTripOdometerForConsumption,
  listVehicleCompletedTripsForConsumption,
  listVehicleFuelRecordsForConsumption,
} from '../../queries/consumption-queries';
import type {
  ClientConsumption,
  ConsumptionAllocationResult,
  ConsumptionResult,
  DriverConsumption,
  FuelConsumptionPeriod,
  RouteConsumption,
  TripFuelConsumption,
  VehicleConsumption,
} from '../../types';
import {allocatePeriodConsumption, buildPeriodId} from './trip-allocation';

/**
 * Fuel Consumption Engine.
 *
 * This module is the single, reusable entry point for every fuel
 * consumption calculation. No screen or query outside this file may
 * implement consumption/allocation math — they must call these methods
 * instead.
 *
 * `calculateConsumptionPeriod` is implemented (RC 26.6.2) using the
 * "Consumo por Período entre Abastecimentos" method: it walks a vehicle's
 * fuel records ordered by odometer and turns every consecutive pair into a
 * `FuelConsumptionPeriod`.
 *
 * `calculateTripConsumption` and `calculateVehicleConsumptionAllocations`
 * are implemented (RC 26.6.3): they ratear (proportionally allocate) each
 * period's liters and cost across the completed trips whose odometer range
 * falls inside it, via the pure algorithm in `./trip-allocation`. Any
 * kilometers of a period not covered by a trip become "Consumo
 * Operacional" — movement not linked to any trip (oficina, lavagem, teste,
 * movimentação interna, reposicionamento do veículo). This allocation is
 * never persisted; it only ever exists as an in-memory object returned by
 * the engine.
 *
 * The remaining methods are still stubs. Upcoming RCs (26.6.x) will
 * aggregate the trip-level allocations above into vehicle, route, driver
 * and client consumption indicators (`calculateVehicleConsumption`,
 * `calculateRouteConsumption`, `calculateDriverConsumption`,
 * `calculateClientConsumption`), and `reprocessVehicleConsumption` will
 * recompute only what changed instead of the whole database.
 */

/**
 * Calculates every consumption period of a vehicle.
 *
 * Each fuel record closes a consumption period together with the vehicle's
 * previous fuel record: the distance travelled between their odometer
 * readings is attributed to the liters/cost of the most recent
 * (closing) fill, since that fill represents the replenishment of the fuel
 * consumed while covering that distance.
 *
 * Rules:
 *   - Fetches all fuel records of the vehicle via
 *     `listVehicleFuelRecordsForConsumption` and orders them chronologically,
 *     using odometer only as a deterministic tie-breaker.
 *   - Records without a known odometer are excluded (no valid distance can
 *     be derived from them).
 *   - A vehicle with fewer than two usable fuel records yields no periods.
 *   - A pair is skipped (not thrown) whenever the resulting distance or the
 *     closing fill's liters are not strictly positive.
 *   - All internal math keeps full precision; rounding for display is the
 *     caller's responsibility.
 *
 * These periods are the foundation for the future rateio per trip and the
 * route/client/driver indicators described in RC 26.6.
 */
export async function calculateConsumptionPeriod(
  supabase: SupabaseClient,
  companyId: string,
  vehicleId: string,
): Promise<FuelConsumptionPeriod[]> {
  const records = await listVehicleFuelRecordsForConsumption(supabase, companyId, vehicleId);

  const withOdometer = records.filter(
    (record): record is typeof record & {odometerKm: number} => record.odometerKm !== null,
  );
  const sorted = [...withOdometer].sort(
    (a, b) => a.fueledAt.localeCompare(b.fueledAt) || a.odometerKm - b.odometerKm,
  );

  const periods: FuelConsumptionPeriod[] = [];

  for (let i = 1; i < sorted.length; i += 1) {
    const start = sorted[i - 1];
    const end = sorted[i];
    const distanceKm = end.odometerKm - start.odometerKm;
    const litersConsumed = end.quantityLiters;

    if (distanceKm <= 0 || litersConsumed <= 0) {
      continue;
    }

    const fuelCost = end.totalAmount;

    periods.push({
      vehicleId,
      startFuelRecordId: start.id,
      endFuelRecordId: end.id,
      startOdometer: start.odometerKm,
      endOdometer: end.odometerKm,
      distanceKm,
      litersConsumed,
      fuelCost,
      pricePerLiter: end.pricePerLiter,
      kmPerLiter: distanceKm / litersConsumed,
      costPerKm: fuelCost / distanceKm,
      periodStart: start.fueledAt,
      periodEnd: end.fueledAt,
    });
  }

  return periods;
}

/**
 * Calculates the estimated fuel consumption allocated to a single trip
 * (RC 26.6.3), based on the rateio of every `FuelConsumptionPeriod` that
 * overlaps its odometer range.
 *
 * A trip whose odometer range spans more than one period (the vehicle was
 * refueled mid-trip) has its allocations from every overlapping period
 * summed together, so no distance/liters/cost is lost or duplicated.
 *
 * Returns `null` when the trip cannot be found, is not completed, has no
 * vehicle, has an invalid odometer range, or does not overlap any known
 * consumption period.
 */
export async function calculateTripConsumption(
  supabase: SupabaseClient,
  companyId: string,
  tripId: string,
): Promise<ConsumptionResult<TripFuelConsumption> | null> {
  const trip = await getTripOdometerForConsumption(supabase, companyId, tripId);

  if (
    !trip ||
    !trip.vehicleId ||
    trip.tripStatus !== 'completed' ||
    trip.initialOdometerKm === null ||
    trip.finalOdometerKm === null ||
    trip.finalOdometerKm <= trip.initialOdometerKm
  ) {
    return null;
  }

  const [periods, trips] = await Promise.all([
    calculateConsumptionPeriod(supabase, companyId, trip.vehicleId),
    listVehicleCompletedTripsForConsumption(supabase, companyId, trip.vehicleId),
  ]);

  const overlappingPeriods = periods.filter(
    (period) => trip.finalOdometerKm! > period.startOdometer && trip.initialOdometerKm! < period.endOdometer,
  );

  if (overlappingPeriods.length === 0) {
    return null;
  }

  const sourcePeriodIds: string[] = [];
  let distanceKm = 0;
  let estimatedLiters = 0;
  let estimatedCost = 0;

  for (const period of overlappingPeriods) {
    const allocation = allocatePeriodConsumption(period, trips);
    const tripAllocation = allocation.tripAllocations.find((candidate) => candidate.tripId === tripId);

    if (!tripAllocation) {
      continue;
    }

    sourcePeriodIds.push(buildPeriodId(period));
    distanceKm += tripAllocation.distanceKm;
    estimatedLiters += tripAllocation.litersAllocated;
    estimatedCost += tripAllocation.costAllocated;
  }

  if (sourcePeriodIds.length === 0) {
    return null;
  }

  const fullTripDistanceKm = trip.finalOdometerKm - trip.initialOdometerKm;
  const distanceShare = fullTripDistanceKm > 0 ? distanceKm / fullTripDistanceKm : null;

  const metrics: TripFuelConsumption = {
    tripId,
    periodId: sourcePeriodIds.length === 1 ? sourcePeriodIds[0] : null,
    distanceKm,
    distanceShare,
    estimatedLiters,
    estimatedCost,
    kmPerLiter: estimatedLiters > 0 ? distanceKm / estimatedLiters : null,
    costPerKm: distanceKm > 0 ? estimatedCost / distanceKm : null,
    consumptionPercentage: distanceShare !== null ? distanceShare * 100 : null,
  };

  return {
    metrics,
    isEstimated: true,
    calculatedAt: new Date().toISOString(),
    sourcePeriodIds,
  };
}

/**
 * Calculates the full rateio (RC 26.6.3) of every consumption period of a
 * vehicle: for each `FuelConsumptionPeriod`, allocates liters/cost across
 * every completed trip that overlaps it and aggregates whatever kilometers
 * are left over into a Consumo Operacional allocation.
 *
 * This is the underlying engine capability that `calculateTripConsumption`
 * queries for a single trip — exposed directly so future RCs (dashboards,
 * reprocessing) can consume the full per-period breakdown without
 * duplicating the algorithm.
 */
export async function calculateVehicleConsumptionAllocations(
  supabase: SupabaseClient,
  companyId: string,
  vehicleId: string,
): Promise<ConsumptionAllocationResult[]> {
  const [periods, trips] = await Promise.all([
    calculateConsumptionPeriod(supabase, companyId, vehicleId),
    listVehicleCompletedTripsForConsumption(supabase, companyId, vehicleId),
  ]);

  return periods.map((period) => allocatePeriodConsumption(period, trips));
}

/**
 * Will aggregate the estimated consumption of every period/trip of a
 * vehicle into a single `VehicleConsumption` summary.
 *
 * Stub: returns `null` until implemented.
 */
export async function calculateVehicleConsumption(
  _supabase: SupabaseClient,
  _companyId: string,
  _vehicleId: string,
): Promise<ConsumptionResult<VehicleConsumption> | null> {
  return null;
}

/**
 * Will aggregate the estimated consumption of every trip that used a given
 * route into a single `RouteConsumption` summary.
 *
 * Stub: returns `null` until implemented.
 */
export async function calculateRouteConsumption(
  _supabase: SupabaseClient,
  _companyId: string,
  _routeId: string,
): Promise<ConsumptionResult<RouteConsumption> | null> {
  return null;
}

/**
 * Will aggregate the estimated consumption of every trip driven by a given
 * driver into a single `DriverConsumption` summary.
 *
 * Stub: returns `null` until implemented.
 */
export async function calculateDriverConsumption(
  _supabase: SupabaseClient,
  _companyId: string,
  _driverId: string,
): Promise<ConsumptionResult<DriverConsumption> | null> {
  return null;
}

/**
 * Will aggregate the estimated consumption of every trip for a given
 * customer into a single `ClientConsumption` summary.
 *
 * Stub: returns `null` until implemented.
 */
export async function calculateClientConsumption(
  _supabase: SupabaseClient,
  _companyId: string,
  _customerId: string,
): Promise<ConsumptionResult<ClientConsumption> | null> {
  return null;
}

/**
 * Will recalculate only the periods/trips of a vehicle affected by a
 * change (a fuel record or trip being created, edited or deleted) —
 * never the whole database. When `sinceFuelRecordId` is provided, only
 * periods from that fuel record onward should be reprocessed.
 *
 * Stub: performs no work and returns a zeroed result until implemented.
 */
export async function reprocessVehicleConsumption(
  _supabase: SupabaseClient,
  _companyId: string,
  _vehicleId: string,
  _options?: {sinceFuelRecordId?: string},
): Promise<{processedPeriods: number}> {
  return {processedPeriods: 0};
}
