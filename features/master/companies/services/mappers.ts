import {PRINCIPAL_ADMIN_ROLE_NAMES} from '../constants';
import {buildCompanyAccessUrl} from '@/features/master/provisioning/utils/access-url';

import type {
  AdminMemberRow,
  Company,
  CompanyDetail,
  CompanyListItem,
  CompanyListRow,
  CompanyRow,
  ProvisionHistoryEntry,
  ProvisionStatus,
} from '../types';
import {
  formatTaxId,
  getDisplayName,
  readNotesFromSettings,
  readPlanSlugFromSettings,
  readProvisionHistoryFromSettings,
} from '../utils/format';

function normalizeSettings(settings: unknown): Record<string, unknown> {
  return settings && typeof settings === 'object'
    ? (settings as Record<string, unknown>)
    : {};
}

function mapProvisionHistory(
  settings: Record<string, unknown>,
): ProvisionHistoryEntry[] {
  return readProvisionHistoryFromSettings(settings).map((entry) => ({
    at: entry.at,
    status: entry.status as ProvisionStatus,
    message: entry.message ?? null,
  }));
}

export function mapCompanyListRow(
  row: CompanyListRow,
  admin?: {fullName: string; email: string} | null,
): CompanyListItem {
  const settings = normalizeSettings(row.settings);
  const planSlug = readPlanSlugFromSettings(settings);

  return {
    id: row.id,
    legalName: row.legal_name,
    tradeName: row.trade_name,
    taxId: row.tax_id,
    slug: row.slug,
    planSlug,
    status: row.status,
    provisionStatus: row.provision_status,
    accessUrl: buildCompanyAccessUrl(row.slug),
    adminName: admin?.fullName ?? null,
    adminEmail: admin?.email ?? null,
    createdAt: row.created_at,
  };
}

export function mapCompanyRow(row: CompanyRow): Company {
  const settings = normalizeSettings(row.settings);

  return {
    id: row.id,
    legalName: row.legal_name,
    tradeName: row.trade_name,
    taxId: row.tax_id,
    slug: row.slug,
    email: row.email,
    phone: row.phone,
    status: row.status,
    planSlug: readPlanSlugFromSettings(settings),
    notes: readNotesFromSettings(settings),
    provisionStatus: row.provision_status,
    provisionedAt: row.provisioned_at,
    provisionError: row.provision_error,
    provisionHistory: mapProvisionHistory(settings),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCompanyDetail(
  company: Company,
  extras: {
    admin: CompanyDetail['admin'];
    branchCount: number;
    memberCount: number;
    vehicleCount: number;
    driverCount: number;
    customerCount: number;
  },
): CompanyDetail {
  return {
    ...company,
    accessUrl: buildCompanyAccessUrl(company.slug),
    admin: extras.admin,
    branchCount: extras.branchCount,
    memberCount: extras.memberCount,
    vehicleCount: extras.vehicleCount,
    driverCount: extras.driverCount,
    customerCount: extras.customerCount,
  };
}

export function isPrincipalAdminRoleName(name: string): boolean {
  return (PRINCIPAL_ADMIN_ROLE_NAMES as readonly string[]).includes(name);
}

export function pickPrincipalAdminMember(
  rows: AdminMemberRow[],
): AdminMemberRow | null {
  for (const roleName of PRINCIPAL_ADMIN_ROLE_NAMES) {
    const match = rows.find(
      (row) => row.roles?.name === roleName && row.profiles,
    );
    if (match) {
      return match;
    }
  }

  return null;
}

export function mapAdminMembersByCompany(
  rows: AdminMemberRow[],
): Map<string, {fullName: string; email: string}> {
  const map = new Map<string, {fullName: string; email: string}>();
  const byCompany = new Map<string, AdminMemberRow[]>();

  for (const row of rows) {
    if (!isPrincipalAdminRoleName(row.roles?.name ?? '') || !row.profiles) {
      continue;
    }
    const companyRows = byCompany.get(row.company_id) ?? [];
    companyRows.push(row);
    byCompany.set(row.company_id, companyRows);
  }

  for (const [companyId, companyRows] of byCompany) {
    const principal = pickPrincipalAdminMember(companyRows);
    if (principal?.profiles && !map.has(companyId)) {
      map.set(companyId, {
        fullName: principal.profiles.full_name,
        email: principal.profiles.email,
      });
    }
  }

  return map;
}

export function formatCompanyListLabel(item: CompanyListItem): string {
  return getDisplayName(item.legalName, item.tradeName);
}

export function formatCompanyTaxIdDisplay(taxId: string): string {
  return formatTaxId(taxId);
}
