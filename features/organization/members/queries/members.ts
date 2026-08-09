import type {SupabaseClient} from '@supabase/supabase-js';

import {createAdminClient} from '@/supabase/server/admin';

import {MEMBERS_PAGE_SIZE} from '../constants';
import type {
  CompanyMemberListItem,
  MemberStatus,
  MemberStatusFilter,
  PaginatedCompanyMembers,
} from '../types';

interface MemberRow {
  id: string;
  profile_id: string;
  role_id: string;
  status: MemberStatus;
  created_at: string;
  updated_at: string;
  roles: {id: string; name: string} | null;
  profiles: {
    full_name: string;
    email: string;
    phone: string | null;
    last_login_at: string | null;
  } | null;
}

function mapMemberRow(row: MemberRow): CompanyMemberListItem {
  return {
    id: row.id,
    profileId: row.profile_id,
    fullName: row.profiles?.full_name ?? '—',
    email: row.profiles?.email ?? '—',
    phone: row.profiles?.phone ?? null,
    roleId: row.role_id,
    roleName: row.roles?.name ?? '—',
    status: row.status === 'inactive' ? 'inactive' : 'active',
    lastLoginAt: row.profiles?.last_login_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const MEMBER_SELECT = `
  id,
  profile_id,
  role_id,
  status,
  created_at,
  updated_at,
  roles ( id, name ),
  profiles!company_members_profile_id_fkey (
    full_name,
    email,
    phone,
    last_login_at
  )
`;

export interface ListCompanyMembersOptions {
  companyId: string;
  search?: string;
  page?: number;
  pageSize?: number;
  status?: MemberStatusFilter;
  /**
   * Use admin client to include profile data for inactive members.
   * Required because profiles_select_company_peers only exposes active peers.
   * Caller must already have asserted members:read for the company.
   */
  useAdminClient?: boolean;
}

export async function listCompanyMembers(
  supabase: SupabaseClient,
  options: ListCompanyMembersOptions,
): Promise<PaginatedCompanyMembers> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = options.pageSize ?? MEMBERS_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const search = options.search?.trim() ?? '';

  // Admin client is intentional: inactive peers are invisible under authenticated
  // profiles RLS. Scope is always filtered by company_id after permission check.
  const client = options.useAdminClient ? createAdminClient() : supabase;

  let query = client
    .from('company_members')
    .select(MEMBER_SELECT, {count: 'exact'})
    .eq('company_id', options.companyId)
    .is('deleted_at', null);

  if (options.status && options.status !== 'all') {
    query = query.eq('status', options.status);
  }

  if (search) {
    const pattern = `%${search}%`;
    const {data: matchingProfiles, error: profileError} = await client
      .from('profiles')
      .select('id')
      .or(`full_name.ilike.${pattern},email.ilike.${pattern}`);

    if (profileError) {
      throw new Error(profileError.message);
    }

    const profileIds = (matchingProfiles ?? []).map((profile) => profile.id);
    if (profileIds.length === 0) {
      return {
        items: [],
        total: 0,
        page,
        pageSize,
        totalPages: 1,
      };
    }

    query = query.in('profile_id', profileIds);
  }

  const {data, error, count} = await query
    .order('created_at', {ascending: false})
    .range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  const total = count ?? 0;
  const items = (data ?? []).map((row) =>
    mapMemberRow(row as unknown as MemberRow),
  );

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getCompanyMemberById(
  companyId: string,
  memberId: string,
): Promise<CompanyMemberListItem | null> {
  // Admin client: see note on listCompanyMembers (inactive peer profiles).
  const admin = createAdminClient();

  const {data, error} = await admin
    .from('company_members')
    .select(MEMBER_SELECT)
    .eq('company_id', companyId)
    .eq('id', memberId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) return null;

  return mapMemberRow(data as unknown as MemberRow);
}

export async function findActiveMembershipByEmail(
  companyId: string,
  email: string,
): Promise<{id: string; profileId: string} | null> {
  const admin = createAdminClient();
  const normalizedEmail = email.trim().toLowerCase();

  const {data: profile, error: profileError} = await admin
    .from('profiles')
    .select('id')
    .ilike('email', normalizedEmail)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (!profile) return null;

  const {data: member, error: memberError} = await admin
    .from('company_members')
    .select('id, profile_id')
    .eq('company_id', companyId)
    .eq('profile_id', profile.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (memberError) {
    throw new Error(memberError.message);
  }

  if (!member) return null;

  return {id: member.id, profileId: member.profile_id};
}
