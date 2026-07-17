import type {SupabaseClient} from '@supabase/supabase-js';

import {listVehicleFuelRecordsForConsumption} from '../../queries/consumption-queries';
import type {
  ClientConsumption,
  ConsumptionResult,
  DriverConsumption,
  FuelConsumptionPeriod,
  RouteConsumption,
  TripFuelConsumption,
  VehicleConsumption,
} from '../../types';

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
 * The remaining methods are still stubs. The algorithm to be implemented in
 * upcoming RCs (26.6.x) will consume these periods to:
 *   1. ratear (proportionally allocate) each period's liters and cost
 *      across the completed trips whose odometer range falls inside it
 *      (`calculateTripConsumption`, `reprocessVehicleConsumption`);
 *   2. aggregate the resulting trip-level allocations into vehicle, route,
 *      driver and client consumption indicators (`calculateVehicleConsumption`,
 *      `calculateRouteConsumption`, `calculateDriverConsumption`,
 *      `calculateClientConsumption`).
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
 *     `listVehicleFuelRecordsForConsumption` and orders them by odometer
 *     ascending.
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
  const sorted = [...withOdometer].sort((a, b) => a.odometerKm - b.odometerKm);

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
 * Will calculate the estimated fuel consumption allocated to a single trip,
 * based on the `FuelConsumptionPeriod`(s) that overlap its odometer range.
 *
 * Stub: returns `null` until implemented.
 */
export async function calculateTripConsumption(
  _supabase: SupabaseClient,
  _companyId: string,
  _tripId: string,
): Promise<ConsumptionResult<TripFuelConsumption> | null> {
  return null;
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
