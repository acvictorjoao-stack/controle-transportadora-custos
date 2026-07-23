import type {CostCenter, CostCenterRow} from '../types';

export function mapCostCenterRow(row: CostCenterRow): CostCenter {
  return {
    id: row.id,
    companyId: row.company_id,
    code: row.code,
    name: row.name,
    description: row.description,
    isSystem: row.is_system,
    status: row.status,
    active: row.status === 'active',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
