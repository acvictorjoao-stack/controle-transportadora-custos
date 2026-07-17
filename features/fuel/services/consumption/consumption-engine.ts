import type {SupabaseClient} from '@supabase/supabase-js';

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
 * Fuel Consumption Engine — infrastructure only (RC 26.6.1).
 *
 * This module is the single, reusable entry point for every future fuel
 * consumption calculation. No screen or query outside this file may
 * implement consumption/allocation math — they must call these methods
 * instead.
 *
 * The methods below are intentionally stubs. The real algorithm, to be
 * implemented in upcoming RCs (26.6.x), will be based exclusively on:
 *   1. the sequence of a vehicle's odometer readings (fuel records +
 *      completed trips' initial/final odometer);
 *   2. the fuel records themselves (liters, amount, date) — see
 *      `features/fuel/queries/consumption-queries.ts`;
 *   3. the vehicle's completed trips that fall within each odometer window
 *      between two consecutive fuel records (a `FuelConsumptionPeriod`).
 *
 * For each period, the distance travelled will be split proportionally
 * across the trips it contains, and that same proportion will be used to
 * ratear (allocate) the period's liters and cost to each trip. Vehicle,
 * route, driver and client consumption are aggregations of the resulting
 * trip-level allocations.
 */

/**
 * Will calculate the `FuelConsumptionPeriod` ending at the given fuel
 * record — i.e. the odometer window between it and the vehicle's previous
 * fuel record (or the vehicle's initial odometer, if there is none).
 *
 * Stub: returns `null` until implemented.
 */
export async function calculateConsumptionPeriod(
  _supabase: SupabaseClient,
  _companyId: string,
  _vehicleId: string,
  _endFuelRecordId: string,
): Promise<FuelConsumptionPeriod | null> {
  return null;
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
