import type {SupabaseClient} from '@supabase/supabase-js';

import type {PortalRole} from '@/lib/auth/permissions';

import {PORTAL_USERS_PAGE_SIZE} from '../constants';
import type {
  PaginatedPortalUsers,
  PortalUserListItem,
  PortalUserRoleFilter,
  PortalUserStatusFilter,
} from '../types';

interface PortalUserRow {
  id: string;
  profile_id: string;
  role: PortalRole;
  active: boolean;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
    last_login_at: string | null;
  } | null;
}

function mapPortalUserRow(row: PortalUserRow): PortalUserListItem {
  return {
    id: row.id,
    profileId: row.profile_id,
    fullName: row.profiles?.full_name ?? '—',
    email: row.profiles?.email ?? '—',
    role: row.role,
    status: row.active ? 'active' : 'inactive',
    lastLoginAt: row.profiles?.last_login_at ?? null,
    createdAt: row.created_at,
  };
}

export interface ListPortalUsersOptions {
  search?: string;
  page?: number;
  pageSize?: number;
  role?: PortalUserRoleFilter;
  status?: PortalUserStatusFilter;
}

export async function listPortalUsers(
  supabase: SupabaseClient,
  options: ListPortalUsersOptions = {},
): Promise<PaginatedPortalUsers> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = options.pageSize ?? PORTAL_USERS_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const search = options.search?.trim() ?? '';

  let query = supabase
    .from('portal_users')
    .select(
      `
      id,
      profile_id,
      role,
      active,
      created_at,
      profiles!portal_users_profile_id_fkey ( full_name, email, last_login_at )
    `,
      {count: 'exact'},
    );

  if (options.role && options.role !== 'all') {
    query = query.eq('role', options.role);
  }

  if (options.status === 'active') {
    query = query.eq('active', true);
  } else if (options.status === 'inactive') {
    query = query.eq('active', false);
  }

  if (search) {
    const pattern = `%${search}%`;
    const {data: matchingProfiles, error: profileError} = await supabase
      .from('profiles')
      .select('id')
      .or(`full_name.ilike.${pattern},email.ilike.${pattern}`);

    if (profileError) {
      throw new Error(profileError.message);
    }

    const profileIds = (matchingProfiles ?? []).map((p) => p.id);

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
    mapPortalUserRow(row as unknown as PortalUserRow),
  );

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getPortalUserById(
  supabase: SupabaseClient,
  id: string,
): Promise<PortalUserListItem | null> {
  const {data, error} = await supabase
    .from('portal_users')
    .select(
      `
      id,
      profile_id,
      role,
      active,
      created_at,
      profiles!portal_users_profile_id_fkey ( full_name, email, last_login_at )
    `,
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) return null;

  return mapPortalUserRow(data as unknown as PortalUserRow);
}
