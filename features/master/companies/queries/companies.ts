import type {SupabaseClient} from '@supabase/supabase-js';

import {cleanupOrphanedTenantAuthUsers} from '@/features/master/provisioning/repositories/auth.repository';
import {createAdminClient} from '@/supabase/server/admin';

import {
  COMPANY_DETAIL_COLUMNS,
  COMPANY_LIST_COLUMNS,
  COMPANIES_PAGE_SIZE,
} from '../constants';
import {
  mapAdminMembersByCompany,
  mapCompanyDetail,
  mapCompanyListRow,
  mapCompanyRow,
} from '../services/mappers';
import type {
  AdminMemberRow,
  Company,
  CompanyDetail,
  CompanyRow,
  CompanySortField,
  CompanySortOrder,
  EntityStatus,
  PaginatedCompanies,
  ProvisionStatus,
} from '../types';
import {mapDatabaseError} from '../utils/database-error';
import {digitsOnly, readPlanSlugFromSettings} from '../utils/format';

function normalizeSettings(settings: unknown): Record<string, unknown> {
  return settings && typeof settings === 'object'
    ? (settings as Record<string, unknown>)
    : {};
}

function normalizeAdminMemberRow(row: Record<string, unknown>): AdminMemberRow {
  const profilesRaw = row.profiles;
  const rolesRaw = row.roles;
  const profiles = Array.isArray(profilesRaw) ? profilesRaw[0] : profilesRaw;
  const roles = Array.isArray(rolesRaw) ? rolesRaw[0] : rolesRaw;

  return {
    company_id: String(row.company_id),
    profile_id: String(row.profile_id),
    profiles:
      profiles && typeof profiles === 'object'
        ? {
            full_name: String((profiles as Record<string, unknown>).full_name ?? ''),
            email: String((profiles as Record<string, unknown>).email ?? ''),
            last_login_at:
              typeof (profiles as Record<string, unknown>).last_login_at === 'string'
                ? ((profiles as Record<string, unknown>).last_login_at as string)
                : null,
          }
        : null,
    roles:
      roles && typeof roles === 'object'
        ? {name: String((roles as Record<string, unknown>).name ?? '')}
        : null,
  };
}

export interface ListCompaniesOptions {
  search?: string;
  page?: number;
  pageSize?: number;
  status?: EntityStatus;
  provisionStatus?: ProvisionStatus;
  planSlug?: string;
  sortBy?: CompanySortField;
  sortOrder?: CompanySortOrder;
}

async function fetchAdminMembersForCompanies(
  supabase: SupabaseClient,
  companyIds: string[],
) {
  if (companyIds.length === 0) {
    return new Map<string, {fullName: string; email: string}>();
  }

  const {data, error} = await supabase
    .from('company_members')
    .select(
      `
      company_id,
      profile_id,
      profiles!company_members_profile_id_fkey ( full_name, email, last_login_at ),
      roles ( name )
    `,
    )
    .in('company_id', companyIds)
    .is('deleted_at', null)
    .eq('status', 'active');

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapAdminMembersByCompany(
    (data ?? []).map((row) => normalizeAdminMemberRow(row as Record<string, unknown>)),
  );
}

export async function listCompanies(
  supabase: SupabaseClient,
  options: ListCompaniesOptions = {},
): Promise<PaginatedCompanies> {
  const search = options.search?.trim() ?? '';
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? COMPANIES_PAGE_SIZE;
  const sortBy = options.sortBy ?? 'created_at';
  const sortOrder = options.sortOrder ?? 'desc';
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('companies')
    .select(COMPANY_LIST_COLUMNS, {count: 'exact'})
    .is('deleted_at', null);

  if (options.status) {
    query = query.eq('status', options.status);
  }

  if (options.provisionStatus) {
    query = query.eq('provision_status', options.provisionStatus);
  }

  if (options.planSlug) {
    query = query.eq('settings->>plan_slug', options.planSlug);
  }

  if (search) {
    const ilike = `%${search}%`;
    const cnpjDigits = digitsOnly(search);
    const filters = [
      `legal_name.ilike.${ilike}`,
      `trade_name.ilike.${ilike}`,
      `slug.ilike.${ilike}`,
    ];

    if (cnpjDigits) {
      filters.push(`tax_id.ilike.%${cnpjDigits}%`);
    }

    query = query.or(filters.join(','));
  }

  query = query.order(sortBy, {ascending: sortOrder === 'asc'});

  const {data, error, count} = await query.range(from, to);

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  const rows = data ?? [];
  const adminMap = await fetchAdminMembersForCompanies(
    supabase,
    rows.map((row) => row.id),
  );

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    items: rows.map((row) =>
      mapCompanyListRow(
        {
          ...row,
          settings: normalizeSettings(row.settings),
        },
        adminMap.get(row.id) ?? null,
      ),
    ),
    total,
    page,
    pageSize,
    totalPages,
  };
}

export async function getCompanyById(
  supabase: SupabaseClient,
  id: string,
): Promise<Company | null> {
  const {data, error} = await supabase
    .from('companies')
    .select(COMPANY_DETAIL_COLUMNS)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  if (!data) {
    return null;
  }

  return mapCompanyRow({
    ...(data as CompanyRow),
    settings: normalizeSettings(data.settings),
  });
}

async function fetchCompanyAdmin(
  supabase: SupabaseClient,
  companyId: string,
): Promise<CompanyDetail['admin']> {
  const {data, error} = await supabase
    .from('company_members')
    .select(
      `
      profile_id,
      profiles!company_members_profile_id_fkey ( full_name, email, last_login_at ),
      roles ( name )
    `,
    )
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .eq('status', 'active');

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  const adminRow = (data ?? [])
    .map((row) => normalizeAdminMemberRow(row as Record<string, unknown>))
    .find((row) => row.roles?.name === 'Super Admin' && row.profiles);

  if (!adminRow?.profiles) {
    return null;
  }

  return {
    profileId: adminRow.profile_id,
    fullName: adminRow.profiles.full_name,
    email: adminRow.profiles.email,
    lastLoginAt: adminRow.profiles.last_login_at,
  };
}

async function countCompanyBranches(
  supabase: SupabaseClient,
  companyId: string,
): Promise<number> {
  const {count, error} = await supabase
    .from('branches')
    .select('id', {count: 'exact', head: true})
    .eq('company_id', companyId)
    .is('deleted_at', null);

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return count ?? 0;
}

async function countCompanyMembers(
  supabase: SupabaseClient,
  companyId: string,
): Promise<number> {
  const {count, error} = await supabase
    .from('company_members')
    .select('id', {count: 'exact', head: true})
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .eq('status', 'active');

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return count ?? 0;
}

export async function getCompanyDetailById(
  supabase: SupabaseClient,
  id: string,
): Promise<CompanyDetail | null> {
  const company = await getCompanyById(supabase, id);
  if (!company) {
    return null;
  }

  const [admin, branchCount, memberCount] = await Promise.all([
    fetchCompanyAdmin(supabase, id),
    countCompanyBranches(supabase, id),
    countCompanyMembers(supabase, id),
  ]);

  return mapCompanyDetail(company, {admin, branchCount, memberCount});
}

export async function updateCompany(
  supabase: SupabaseClient,
  id: string,
  input: {
    legalName: string;
    tradeName?: string | null;
    slug: string;
    email: string;
    phone?: string | null;
    status: Company['status'];
    planSlug?: string;
    notes?: string | null;
    existingSettings?: Record<string, unknown>;
  },
): Promise<Company> {
  const settings = {
    ...(input.existingSettings ?? {}),
    notes: input.notes?.trim() || null,
    plan_slug:
      input.planSlug ??
      readPlanSlugFromSettings(input.existingSettings ?? {}),
  };

  const {data, error} = await supabase
    .from('companies')
    .update({
      legal_name: input.legalName,
      trade_name: input.tradeName?.trim() || null,
      slug: input.slug,
      email: input.email.trim(),
      phone: input.phone?.trim() || null,
      status: input.status,
      settings,
    })
    .eq('id', id)
    .is('deleted_at', null)
    .select(COMPANY_DETAIL_COLUMNS)
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapCompanyRow({
    ...(data as CompanyRow),
    settings: normalizeSettings(data.settings),
  });
}

export async function updateCompanyStatus(
  supabase: SupabaseClient,
  id: string,
  status: Company['status'],
): Promise<Company> {
  const {data, error} = await supabase
    .from('companies')
    .update({status})
    .eq('id', id)
    .is('deleted_at', null)
    .select(COMPANY_DETAIL_COLUMNS)
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapCompanyRow({
    ...(data as CompanyRow),
    settings: normalizeSettings(data.settings),
  });
}

export async function softDeleteCompany(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const deletedAt = new Date().toISOString();
  const admin = createAdminClient();

  const {data: members, error: membersError} = await admin
    .from('company_members')
    .select('profile_id')
    .eq('company_id', id)
    .is('deleted_at', null);

  if (membersError) {
    throw new Error(mapDatabaseError(membersError));
  }

  const {error} = await supabase
    .from('companies')
    .update({deleted_at: deletedAt})
    .eq('id', id)
    .is('deleted_at', null);

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  const {error: membersDeleteError} = await admin
    .from('company_members')
    .update({deleted_at: deletedAt})
    .eq('company_id', id)
    .is('deleted_at', null);

  if (membersDeleteError) {
    throw new Error(mapDatabaseError(membersDeleteError));
  }

  const profileIds = [...new Set((members ?? []).map((member) => member.profile_id))];
  await cleanupOrphanedTenantAuthUsers(profileIds);
}

export async function getCompanySettings(
  supabase: SupabaseClient,
  id: string,
): Promise<Record<string, unknown>> {
  const {data, error} = await supabase
    .from('companies')
    .select('settings')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return normalizeSettings(data?.settings);
}

export async function appendProvisionHistoryEntry(
  supabase: SupabaseClient,
  companyId: string,
  entry: {status: ProvisionStatus; message?: string | null},
): Promise<void> {
  const settings = await getCompanySettings(supabase, companyId);
  const history = Array.isArray(settings.provision_history)
    ? [...settings.provision_history]
    : [];

  history.push({
    at: new Date().toISOString(),
    status: entry.status,
    message: entry.message ?? null,
  });

  const {error} = await supabase
    .from('companies')
    .update({
      settings: {
        ...settings,
        provision_history: history,
      },
    })
    .eq('id', companyId)
    .is('deleted_at', null);

  if (error) {
    throw new Error(mapDatabaseError(error));
  }
}
