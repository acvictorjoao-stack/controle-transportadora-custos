/**
 * Embed de filial via FK composta `drivers_branch_company_fkey`
 * (company_id, branch_id) → branches(company_id, id).
 * Hint por coluna `branch_id` gera PGRST200 após a migration 091.
 */
export const DRIVER_BRANCH_EMBED =
  'branches!drivers_branch_company_fkey(id, name, code)';

export const DRIVER_LIST_COLUMNS = `
  id, company_id, branch_id, name, cpf, rg, cnh_number, license_category,
  license_issued_at, license_expires_at, ear, birth_date, phone, whatsapp, email,
  address, zip_code, city, state, notes, photo_url, photo_storage_path,
  operational_status, hired_at, terminated_at, contract_type, emergency_contact,
  external_id, integration_source, metadata, status, created_at, updated_at,
  deleted_at, created_by, updated_by,
  ${DRIVER_BRANCH_EMBED}
`;

export const DRIVER_DETAIL_COLUMNS = `
  id, company_id, branch_id, name, cpf, rg, cnh_number, license_category,
  license_issued_at, license_expires_at, ear, birth_date, phone, whatsapp, email,
  address, zip_code, city, state, notes, photo_url, photo_storage_path,
  operational_status, hired_at, terminated_at, contract_type, emergency_contact,
  external_id, integration_source, metadata, status, created_at, updated_at,
  deleted_at, created_by, updated_by,
  ${DRIVER_BRANCH_EMBED}
`;

export const DRIVERS_PAGE_SIZE = 10;

export {DRIVER_STORAGE_BUCKET} from '@/lib/storage/buckets';
