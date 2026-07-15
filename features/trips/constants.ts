export const TRIP_LIST_COLUMNS = `
  id, company_id, branch_id, trip_number, trip_status, driver_id, vehicle_id,
  client_name, contract_reference, customer_id, customer_contract_id,
  freight_table, contracted_freight_value, actual_freight_value, freight_margin,
  origin, destination, route, route_id,
  planned_distance_km, planned_departure_at,
  departed_at, arrived_at,
  initial_odometer_km, final_odometer_km, responsible, status, created_at, updated_at,
  branches:branch_id (id, name, code),
  drivers:driver_id (id, name),
  vehicles:vehicle_id (id, plate, fleet_number),
  customers:customer_id (id, legal_name, trade_name),
  routes:route_id (id, name, code, origin, destination, planned_distance_km)
`;

export const TRIP_DETAIL_COLUMNS = `
  id, company_id, branch_id, trip_number, trip_status, driver_id, vehicle_id,
  client_name, contract_reference, customer_id, customer_contract_id,
  freight_table, contracted_freight_value, actual_freight_value, freight_margin,
  origin, destination, route, route_id,
  planned_distance_km, planned_departure_at,
  initial_odometer_km, final_odometer_km, initial_hour_meter, final_hour_meter,
  departed_at, arrived_at, weight_kg, volume_m3, cargo_type, notes, responsible,
  metadata, status, external_id, integration_source,
  created_at, updated_at, deleted_at, created_by, updated_by,
  branches:branch_id (id, name, code),
  drivers:driver_id (id, name, cpf),
  vehicles:vehicle_id (id, plate, fleet_number, brand, model),
  customers:customer_id (id, legal_name, trade_name),
  routes:route_id (id, name, code, origin, destination, planned_distance_km)
`;

export const TRIPS_PAGE_SIZE = 10;

export {TRIP_STORAGE_BUCKET} from '@/lib/storage/buckets';
