export const FUEL_LIST_COLUMNS = `
  id, company_id, branch_id, vehicle_id, driver_id, trip_id,
  station_name, station_brand, city, state, fueled_at, fuel_type,
  quantity_liters, price_per_liter, total_amount, odometer_km, hour_meter,
  km_traveled, consumption_l_per_100km, km_per_liter, cost_per_km, autonomy_km,
  notes, responsible, is_inconsistent, inconsistency_flags,
  payment_type, payment_due_date, status, created_at,
  branches:branch_id (id, name, code),
  vehicles:vehicle_id (id, plate, model),
  drivers:driver_id (id, name),
  trips:trip_id (id, trip_number)
`;

export const FUEL_DETAIL_COLUMNS = `
  id, company_id, branch_id, vehicle_id, driver_id, trip_id,
  station_name, station_brand, city, state, fueled_at, fuel_type,
  quantity_liters, price_per_liter, total_amount, odometer_km, hour_meter,
  km_traveled, consumption_l_per_100km, km_per_liter, cost_per_km, autonomy_km,
  notes, responsible, is_inconsistent, inconsistency_flags,
  payment_type, payment_due_date,
  external_id, integration_source, metadata, status,
  created_at, updated_at, deleted_at, created_by, updated_by,
  branches:branch_id (id, name, code),
  vehicles:vehicle_id (id, plate, model, fuel_type),
  drivers:driver_id (id, name, cpf)
`;

export const FUEL_PAGE_SIZE = 10;

export {FUEL_STORAGE_BUCKET} from '@/lib/storage/buckets';
