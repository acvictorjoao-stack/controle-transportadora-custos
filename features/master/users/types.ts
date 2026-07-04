import type {PortalRole} from '@/lib/auth/permissions';

export type PortalUserStatus = 'active' | 'inactive';

export interface PortalUserListItem {
  id: string;
  profileId: string;
  fullName: string;
  email: string;
  role: PortalRole;
  status: PortalUserStatus;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface PaginatedPortalUsers {
  items: PortalUserListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type PortalUserRoleFilter = PortalRole | 'all';
export type PortalUserStatusFilter = PortalUserStatus | 'all';
