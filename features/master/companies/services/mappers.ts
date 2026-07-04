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
  },
): CompanyDetail {
  return {
    ...company,
    accessUrl: buildCompanyAccessUrl(company.slug),
    admin: extras.admin,
    branchCount: extras.branchCount,
    memberCount: extras.memberCount,
  };
}

export function mapAdminMembersByCompany(
  rows: AdminMemberRow[],
): Map<string, {fullName: string; email: string}> {
  const map = new Map<string, {fullName: string; email: string}>();

  for (const row of rows) {
    if (row.roles?.name !== 'Super Admin' || !row.profiles) {
      continue;
    }
    if (!map.has(row.company_id)) {
      map.set(row.company_id, {
        fullName: row.profiles.full_name,
        email: row.profiles.email,
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
