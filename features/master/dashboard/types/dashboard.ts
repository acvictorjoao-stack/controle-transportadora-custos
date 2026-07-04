export interface MasterDashboardStats {
  totalCompanies: number;
  activeCompanies: number;
  suspendedCompanies: number;
  createdThisMonth: number;
  provisioningErrors: number;
  planCounts: Record<string, number>;
}

export interface RecentSignupItem {
  id: string;
  legalName: string;
  tradeName: string | null;
  planSlug: string | null;
  status: 'active' | 'inactive' | 'blocked' | 'archived';
  createdAt: string;
}
