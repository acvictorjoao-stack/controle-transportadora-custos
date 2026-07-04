import type {Branch, BranchRow} from '../types';

export function mapBranchRow(row: BranchRow): Branch {
  return {
    id: row.id,
    companyId: row.company_id,
    code: row.code,
    name: row.name,
    taxId: row.tax_id,
    isHeadquarters: row.is_headquarters,
    addressStreet: row.address_street,
    addressCity: row.address_city,
    addressState: row.address_state,
    addressZip: row.address_zip,
    phone: row.phone,
    responsibleName: row.responsible_name,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
