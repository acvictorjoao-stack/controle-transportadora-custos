export type ProvisionStatus = 'pending' | 'in_progress' | 'completed' | 'error';

export interface ProvisionCompanyInput {
  legalName: string;
  tradeName?: string;
  taxId: string;
  email: string;
  phone?: string;
  slug: string;
  planSlug?: string;
  adminName: string;
  adminEmail: string;
}

export interface ProvisionCompanyResult {
  companyId: string;
  companyName: string;
  taxId: string;
  slug: string;
  accessUrl: string;
  adminEmail: string;
  temporaryPassword: string;
  provisionStatus: ProvisionStatus;
  memberId: string;
}

export interface ProvisionCompanyErrorResult {
  companyId?: string;
  message: string;
  provisionStatus: ProvisionStatus;
}
