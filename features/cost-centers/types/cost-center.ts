import type {EntityStatus} from '@/features/organization/companies/types';

export interface CostCenterRow {
  id: string;
  company_id: string;
  code: string;
  name: string;
  description: string | null;
  is_system: boolean;
  status: EntityStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CostCenter {
  id: string;
  companyId: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  status: EntityStatus;
  /** Derived from status === 'active' for UI convenience. */
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CostCenterSelectOption = Pick<CostCenter, 'id' | 'code' | 'name' | 'active'>;

export interface PaginatedCostCenters {
  items: CostCenter[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const COST_CENTER_STATUS_LABELS: Record<EntityStatus, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  blocked: 'Bloqueado',
  archived: 'Arquivado',
};

/** System-seeded codes used by resolveCostCenter(). */
export const SYSTEM_COST_CENTER_CODES = [
  'OPERACIONAL',
  'ADMINISTRATIVO',
  'COMERCIAL',
  'RH',
  'TI',
] as const;

export type SystemCostCenterCode = (typeof SYSTEM_COST_CENTER_CODES)[number];
