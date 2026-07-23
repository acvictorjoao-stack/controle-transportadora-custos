export const FINANCIAL_LIST_COLUMNS = `
  id, company_id, branch_id, vehicle_id, driver_id, trip_id,
  fuel_record_id, maintenance_record_id, tire_id,
  customer_id, customer_contract_id,
  category_id, cost_center_id, entry_type, entry_status,
  description, reference_number, supplier, client, amount, currency, entry_date, due_date,
  paid_at, paid_amount,
  source_module, source_id, is_system_generated, status, created_at,
  branches:branch_id (id, name, code),
  vehicles:vehicle_id (id, plate, model),
  drivers:driver_id (id, name),
  trips:trip_id (id, trip_number),
  customers:customer_id (id, legal_name, trade_name),
  financial_categories:category_id (id, name, slug),
  cost_centers:cost_center_id (id, name, code)
`;

export const FINANCIAL_DETAIL_COLUMNS = `
  id, company_id, branch_id, vehicle_id, driver_id, trip_id,
  fuel_record_id, maintenance_record_id, tire_id,
  customer_id, customer_contract_id,
  category_id, cost_center_id, entry_type, entry_status,
  description, reference_number, supplier, client, amount, currency, entry_date, due_date,
  paid_at, paid_amount,
  reversed_entry_id, source_module, source_id, is_system_generated, notes,
  external_id, integration_source, metadata, status,
  created_at, updated_at, deleted_at, created_by, updated_by,
  branches:branch_id (id, name, code),
  vehicles:vehicle_id (id, plate, model),
  drivers:driver_id (id, name, cpf),
  trips:trip_id (id, trip_number, origin, destination, trip_status),
  customers:customer_id (id, legal_name, trade_name),
  financial_categories:category_id (id, name, slug),
  cost_centers:cost_center_id (id, name, code)
`;

export const FINANCIAL_PAGE_SIZE = 10;

export {FINANCIAL_STORAGE_BUCKET} from '@/lib/storage/buckets';
