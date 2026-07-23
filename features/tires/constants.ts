export const TIRE_LIST_COLUMNS = `
  id, company_id, branch_id, vehicle_id, maintenance_record_id,
  asset_number, internal_code, brand, model, tire_size, manufacturer,
  dot_number, fire_number, serial_number,
  expected_life_km, current_km, accumulated_km,
  purchase_date, purchase_value, supplier, warranty,
  tire_status, current_position, notes,
  recap_count, total_recap_cost, remaining_life_km, cost_per_km, last_tread_depth_mm,
  payment_type, payment_due_date,
  status, created_at,
  branches:branch_id (id, name, code),
  vehicles:vehicle_id (id, plate, model)
`;

export const TIRE_DETAIL_COLUMNS = `
  id, company_id, branch_id, vehicle_id, maintenance_record_id,
  asset_number, internal_code, brand, model, tire_size, manufacturer,
  dot_number, fire_number, serial_number,
  expected_life_km, current_km, accumulated_km,
  purchase_date, purchase_value, supplier, warranty,
  tire_status, current_position, notes,
  recap_count, total_recap_cost, remaining_life_km, cost_per_km, last_tread_depth_mm,
  payment_type, payment_due_date,
  external_id, integration_source, metadata, status,
  created_at, updated_at, deleted_at, created_by, updated_by,
  branches:branch_id (id, name, code),
  vehicles:vehicle_id (id, plate, model)
`;

export const TIRE_PAGE_SIZE = 10;

export {TIRE_STORAGE_BUCKET} from '@/lib/storage/buckets';
