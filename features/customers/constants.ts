export const CUSTOMER_LIST_COLUMNS = `
  id, company_id, branch_id, legal_name, trade_name, tax_id,
  email, phone, whatsapp, customer_status, segment,
  sales_representative, credit_limit, payment_term_days,
  status, created_at, updated_at,
  branches:branch_id (id, name, code)
`;

export const CUSTOMER_DETAIL_COLUMNS = `
  id, company_id, branch_id, legal_name, trade_name, tax_id,
  state_registration, municipal_registration, email, phone, whatsapp, website,
  customer_status, segment, notes, sales_representative,
  credit_limit, payment_term_days, external_id, integration_source,
  metadata, status, created_at, updated_at, deleted_at, created_by, updated_by,
  branches:branch_id (id, name, code)
`;

export const CUSTOMER_CONTRACT_LIST_COLUMNS = `
  id, company_id, branch_id, customer_id, contract_number, contract_status,
  starts_at, ends_at, contract_type, freight_table, currency, notes,
  readjustment_index, readjustment_notes, contracted_revenue,
  metadata, status, created_at, updated_at
`;

export const CUSTOMERS_PAGE_SIZE = 10;

export {CUSTOMER_STORAGE_BUCKET} from '@/lib/storage/buckets';
