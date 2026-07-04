import type {EntityStatus} from '../../companies/types';

export interface BranchRow {
  id: string;
  company_id: string;
  code: string;
  name: string;
  tax_id: string | null;
  is_headquarters: boolean;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  phone: string | null;
  responsible_name: string | null;
  status: EntityStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Branch {
  id: string;
  companyId: string;
  code: string;
  name: string;
  taxId: string | null;
  isHeadquarters: boolean;
  addressStreet: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZip: string | null;
  phone: string | null;
  responsibleName: string | null;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}

export type BranchSelectOption = Pick<Branch, 'id' | 'name' | 'code'>;

export interface PaginatedBranches {
  items: Branch[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const BRANCH_STATUS_LABELS: Record<EntityStatus, string> = {
  active: 'Ativa',
  inactive: 'Inativa',
  blocked: 'Bloqueada',
  archived: 'Arquivada',
};
