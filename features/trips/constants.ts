export const TRIP_LIST_COLUMNS = `
  id, company_id, branch_id, trip_number, trip_status, driver_id, vehicle_id,
  client_name, contract_reference, customer_id, customer_contract_id,
  freight_table, contracted_freight_value, actual_freight_value, freight_margin,
  origin, destination, route, route_id,
  planned_distance_km, planned_departure_at,
  lead_time_minutes, unload_time_minutes, planned_arrival_at, planned_completion_at,
  departed_at, arrived_at, started_at, completed_at, cancelled_at, cancellation_notes,
  initial_odometer_km, final_odometer_km, responsible, status, created_at, updated_at,
  branches:branch_id (id, name, code),
  drivers:driver_id (id, name),
  vehicles:vehicle_id (id, plate, fleet_number),
  customers:customer_id (id, legal_name, trade_name),
  routes:route_id (id, name, code, origin, destination, planned_distance_km, lead_time_minutes, unload_time_minutes)
`;

export const TRIP_DETAIL_COLUMNS = `
  id, company_id, branch_id, trip_number, trip_status, driver_id, vehicle_id,
  client_name, contract_reference, customer_id, customer_contract_id,
  freight_table, contracted_freight_value, actual_freight_value, freight_margin,
  origin, destination, route, route_id,
  planned_distance_km, planned_departure_at,
  lead_time_minutes, unload_time_minutes, planned_arrival_at, planned_completion_at,
  initial_odometer_km, final_odometer_km, initial_hour_meter, final_hour_meter,
  departed_at, arrived_at, started_at, completed_at, cancelled_at, cancellation_notes,
  weight_kg, volume_m3, cargo_type, notes, responsible,
  metadata, status, external_id, integration_source,
  created_at, updated_at, deleted_at, created_by, updated_by,
  branches:branch_id (id, name, code),
  drivers:driver_id (id, name, cpf),
  vehicles:vehicle_id (id, plate, fleet_number, brand, model),
  customers:customer_id (id, legal_name, trade_name),
  routes:route_id (id, name, code, origin, destination, planned_distance_km, lead_time_minutes, unload_time_minutes)
`;

export const TRIP_HISTORY_COLUMNS =
  'id, company_id, branch_id, trip_id, action, changes, previous_trip_status, new_trip_status, created_at, created_by';

export const TRIP_DOCUMENT_COLUMNS =
  'id, company_id, branch_id, trip_id, name, file_url, storage_path, document_type, mime_type, file_size, created_at, deleted_at, created_by';

export const TRIP_OCCURRENCE_COLUMNS =
  'id, company_id, branch_id, trip_id, occurrence_type, description, occurred_at, created_at, deleted_at';

export const TRIP_CHECKLIST_COLUMNS =
  'id, company_id, branch_id, trip_id, tires_ok, headlights_ok, brakes_ok, documentation_ok, fuel_ok, odometer_reading, hour_meter_reading, photo_urls, signature_url, notes, completed_at, created_at, updated_at';

export const TRIP_EXPENSE_COLUMNS =
  'id, company_id, branch_id, trip_id, expense_type, amount, currency, description, notes, expense_date, receipt_url, created_at, deleted_at';

export const TRIP_STOP_COLUMNS =
  'id, company_id, branch_id, trip_id, client_name, stop_date, stop_time, latitude, longitude, stopped_minutes, notes, created_at, deleted_at';

export const TRIP_LOCATION_COLUMNS =
  'id, company_id, branch_id, trip_id, latitude, longitude, recorded_at, speed_kmh, accuracy_m, created_at';

export const TRIPS_PAGE_SIZE = 10;

export {TRIP_STORAGE_BUCKET} from '@/lib/storage/buckets';
