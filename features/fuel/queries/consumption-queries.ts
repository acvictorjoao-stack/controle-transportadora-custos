import type {SupabaseClient} from '@supabase/supabase-js';

import {mapDatabaseError} from '@/features/master/companies/utils/database-error';

/**
 * Centralized read-only data access for the future Fuel Consumption Engine
 * (RC 26.6.x). These queries only fetch the raw inputs the engine will need
 * — a vehicle's fuel records, its completed trips and its current odometer
 * reading. Screens must never assemble this data or perform consumption
 * math directly; they should go through
 * `features/fuel/services/consumption` instead.
 */

export interface VehicleFuelRecordForConsumption {
  id: string;
  odometerKm: number | null;
  quantityLiters: number;
  totalAmount: number;
  pricePerLiter: number;
  fueledAt: string;
}

export interface VehicleTripForConsumption {
  id: string;
  initialOdometerKm: number | null;
  finalOdometerKm: number | null;
  routeId: string | null;
  customerId: string | null;
  driverId: string | null;
}

/** Fuel records of a vehicle ordered by odometer/date, oldest first. */
export async function listVehicleFuelRecordsForConsumption(
  supabase: SupabaseClient,
  companyId: string,
  vehicleId: string,
): Promise<VehicleFuelRecordForConsumption[]> {
  const {data, error} = await supabase
    .from('fuel_records')
    .select('id, odometer_km, quantity_liters, total_amount, price_per_liter, fueled_at')
    .eq('company_id', companyId)
    .eq('vehicle_id', vehicleId)
    .is('deleted_at', null)
    .order('odometer_km', {ascending: true, nullsFirst: false})
    .order('fueled_at', {ascending: true});

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    odometerKm: row.odometer_km !== null ? Number(row.odometer_km) : null,
    quantityLiters: Number(row.quantity_liters),
    totalAmount: Number(row.total_amount),
    pricePerLiter: Number(row.price_per_liter),
    fueledAt: row.fueled_at,
  }));
}

/** Completed trips of a vehicle ordered by odometer, oldest first. */
export async function listVehicleCompletedTripsForConsumption(
  supabase: SupabaseClient,
  companyId: string,
  vehicleId: string,
): Promise<VehicleTripForConsumption[]> {
  const {data, error} = await supabase
    .from('trips')
    .select('id, initial_odometer_km, final_odometer_km, route_id, customer_id, driver_id')
    .eq('company_id', companyId)
    .eq('vehicle_id', vehicleId)
    .eq('trip_status', 'completed')
    .is('deleted_at', null)
    .order('initial_odometer_km', {ascending: true, nullsFirst: false});

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    initialOdometerKm: row.initial_odometer_km !== null ? Number(row.initial_odometer_km) : null,
    finalOdometerKm: row.final_odometer_km !== null ? Number(row.final_odometer_km) : null,
    routeId: row.route_id,
    customerId: row.customer_id,
    driverId: row.driver_id,
  }));
}

/** The vehicle's current odometer reading, used as the upper bound of the last open period. */
export async function getVehicleCurrentOdometerForConsumption(
  supabase: SupabaseClient,
  companyId: string,
  vehicleId: string,
): Promise<number | null> {
  const {data, error} = await supabase
    .from('vehicles')
    .select('current_odometer_km')
    .eq('id', vehicleId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  if (!data || data.current_odometer_km === null || data.current_odometer_km === undefined) {
    return null;
  }

  return Number(data.current_odometer_km);
}
