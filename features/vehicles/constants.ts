export const VEHICLE_LIST_COLUMNS = `
  id, company_id, branch_id, plate, vehicle_type, body_type, brand, model, year,
  current_odometer_km, asset_status, photo_url, status, notes, created_at, updated_at,
  branches:branch_id (id, name, code)
`;

export const VEHICLE_DETAIL_COLUMNS = `
  id, company_id, branch_id, plate, fleet_number, vehicle_type, body_type, brand, model, year,
  renavam, chassis, color, fuel_type, load_capacity_kg, gross_weight_kg, tare_kg, axles,
  initial_odometer_km, current_odometer_km, hour_meter, asset_status, photo_url, crlv_url,
  photo_storage_path, crlv_storage_path, external_id, integration_source, metadata,
  status, notes, created_at, updated_at, deleted_at, created_by, updated_by,
  branches:branch_id (id, name, code)
`;

export const VEHICLES_PAGE_SIZE = 10;

export {VEHICLE_STORAGE_BUCKET} from '@/lib/storage/buckets';
