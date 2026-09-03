export type EntityStatus = 'active' | 'inactive' | 'blocked' | 'archived';



export type ProvisionStatus = 'pending' | 'in_progress' | 'completed' | 'error';



export interface ProvisionHistoryEntry {

  at: string;

  status: ProvisionStatus;

  message?: string | null;

}



export interface CompanyAdmin {

  profileId: string;

  fullName: string;

  email: string;

  lastLoginAt: string | null;

}



export interface Company {

  id: string;

  legalName: string;

  tradeName: string | null;

  taxId: string;

  slug: string;

  email: string;

  phone: string | null;

  status: EntityStatus;

  planSlug: string;

  notes: string | null;

  provisionStatus: ProvisionStatus;

  provisionedAt: string | null;

  provisionError: string | null;

  provisionHistory: ProvisionHistoryEntry[];

  createdAt: string;

  updatedAt: string;

}



export interface CompanyListItem {

  id: string;

  legalName: string;

  tradeName: string | null;

  taxId: string;

  slug: string;

  planSlug: string;

  status: EntityStatus;

  provisionStatus: ProvisionStatus;

  accessUrl: string;

  adminName: string | null;

  adminEmail: string | null;

  createdAt: string;

}



export interface CompanyDetail extends Company {

  accessUrl: string;

  admin: CompanyAdmin | null;

  branchCount: number;

  memberCount: number;

  vehicleCount: number;

  driverCount: number;

  customerCount: number;

}

export interface CompanyIndicators {
  branchCount: number;
  memberCount: number;
  vehicleCount: number;
  driverCount: number;
  customerCount: number;
}

export interface CompanyBranchSummary {
  id: string;
  code: string;
  name: string;
  city: string | null;
  state: string | null;
  status: EntityStatus;
  isHeadquarters: boolean;
}

export interface CompanyMemberSummary {
  id: string;
  fullName: string;
  email: string;
  roleName: string;
  status: EntityStatus;
  lastLoginAt: string | null;
}

export interface CompanyBranchRow {
  id: string;
  code: string;
  name: string;
  address_city: string | null;
  address_state: string | null;
  status: EntityStatus;
  is_headquarters: boolean;
}

export interface CompanyMemberSummaryRow {
  id: string;
  status: EntityStatus;
  profiles: {
    full_name: string;
    email: string;
    last_login_at: string | null;
  } | null;
  roles: {
    name: string;
  } | null;
}



export interface PaginatedCompanies {

  items: CompanyListItem[];

  total: number;

  page: number;

  pageSize: number;

  totalPages: number;

}



export type CompanySortField = 'created_at' | 'legal_name' | 'status';

export type CompanySortOrder = 'asc' | 'desc';



export interface CompanyRow {

  id: string;

  legal_name: string;

  trade_name: string | null;

  tax_id: string;

  slug: string;

  email: string;

  phone: string | null;

  settings: Record<string, unknown>;

  status: EntityStatus;

  provision_status: ProvisionStatus;

  provisioned_at: string | null;

  provision_error: string | null;

  created_at: string;

  updated_at: string;

  deleted_at: string | null;

}



export interface CompanyListRow {

  id: string;

  legal_name: string;

  trade_name: string | null;

  tax_id: string;

  slug: string;

  settings: Record<string, unknown>;

  status: EntityStatus;

  provision_status: ProvisionStatus;

  created_at: string;

}



export interface AdminMemberRow {

  company_id: string;

  profile_id: string;

  profiles: {

    full_name: string;

    email: string;

    last_login_at: string | null;

  } | null;

  roles: {

    name: string;

  } | null;

}

