import type {EntityStatus} from '@/features/organization/companies/types/company-profile';

export type MemberStatus = Extract<EntityStatus, 'active' | 'inactive'>;

export interface CompanyRoleOption {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
}

export interface CompanyMemberListItem {
  id: string;
  profileId: string;
  fullName: string;
  email: string;
  phone: string | null;
  roleId: string;
  roleName: string;
  status: MemberStatus;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedCompanyMembers {
  items: CompanyMemberListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type MemberStatusFilter = MemberStatus | 'all';
