export const MAINTENANCE_LIST_COLUMNS = `
  id, company_id, branch_id, vehicle_id, driver_id, trip_id,
  maintenance_type, priority, maintenance_status,
  supplier, workshop, opened_at, completed_at,
  odometer_km, hour_meter, downtime_hours,
  description, estimated_amount, final_amount, total_cost,
  responsible, status, created_at,
  branches:branch_id (id, name, code),
  vehicles:vehicle_id (id, plate, model),
  drivers:driver_id (id, name),
  trips:trip_id (id, trip_number)
`;

export const MAINTENANCE_DETAIL_COLUMNS = `
  id, company_id, branch_id, vehicle_id, driver_id, trip_id,
  maintenance_type, priority, maintenance_status,
  supplier, workshop, opened_at, completed_at,
  odometer_km, hour_meter, downtime_hours,
  description, diagnosis, solution, notes,
  estimated_amount, final_amount, parts_total, services_total, total_cost, cost_per_km,
  responsible, external_id, integration_source, metadata, status,
  created_at, updated_at, deleted_at, created_by, updated_by,
  branches:branch_id (id, name, code),
  vehicles:vehicle_id (id, plate, model),
  drivers:driver_id (id, name, cpf),
  trips:trip_id (id, trip_number, origin, destination, trip_status)
`;

export const MAINTENANCE_PAGE_SIZE = 10;

export {MAINTENANCE_STORAGE_BUCKET} from '@/lib/storage/buckets';
