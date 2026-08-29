import type {SupabaseClient} from '@supabase/supabase-js';

import {getMasterActingCompanyId} from '@/lib/auth/master-company-context';
import {isPortalOwner} from '@/lib/auth/portal';
import {createClient} from '@/supabase/server';
import {measureMiddlewareSupabase} from '@/supabase/middleware/timing';

export const COMPANY_ACCESS_DENIED =
  'Você não tem permissão para realizar esta ação nesta empresa.';

export interface CompanyMembership {
  companyId: string;
  profileId: string;
  roleId: string;
  defaultBranchId: string | null;
  /** True when access comes from Portal Master acting context (not company_members). */
  isMasterActing?: boolean;
}

export async function getServerSupabaseClient() {
  return createClient();
}

export async function getCurrentUserId(
  supabase: SupabaseClient,
): Promise<string | null> {
  const {data, error} = await measureMiddlewareSupabase(
    supabase,
    'auth.getUser',
    'auth_getUser',
    () => supabase.auth.getUser(),
  );
  if (error || !data.user) return null;
  return data.user.id;
}

export async function getUserCompanyMembership(
  supabase: SupabaseClient,
  companyId?: string,
): Promise<CompanyMembership | null> {
  const userId = await getCurrentUserId(supabase);
  if (!userId) return null;

  let query = supabase
    .from('company_members')
    .select('company_id, profile_id, role_id, default_branch_id')
    .eq('profile_id', userId)
    .is('deleted_at', null)
    .eq('status', 'active')
    .limit(1);

  if (companyId) {
    query = query.eq('company_id', companyId);
  }

  const {data, error} = await measureMiddlewareSupabase(
    supabase,
    'company_members',
    'company_members',
    () => query.maybeSingle(),
  );

  if (error || !data) return null;

  return {
    companyId: data.company_id,
    profileId: data.profile_id,
    roleId: data.role_id,
    defaultBranchId: data.default_branch_id,
  };
}

/**
 * Resolves current company from:
 * 1) Master acting context (portal owner + validated portal_acting_companies)
 * 2) Active company_members row
 * Never accepts company_id from the client.
 */
export async function getCurrentCompanyId(
  supabase: SupabaseClient,
): Promise<string | null> {
  if (await isPortalOwner(supabase)) {
    const actingCompanyId = await getMasterActingCompanyId(supabase);
    if (actingCompanyId) return actingCompanyId;
  }

  const membership = await getUserCompanyMembership(supabase);
  return membership?.companyId ?? null;
}

/**
 * Membership or Master acting context for the current company.
 * Master path does not invent a real company_members row.
 */
export async function getCompanyAccessContext(
  supabase: SupabaseClient,
  companyId?: string,
): Promise<CompanyMembership | null> {
  const userId = await getCurrentUserId(supabase);
  if (!userId) return null;

  if (await isPortalOwner(supabase)) {
    const actingCompanyId = await getMasterActingCompanyId(supabase);
    if (
      actingCompanyId &&
      (!companyId || companyId === actingCompanyId)
    ) {
      return {
        companyId: actingCompanyId,
        profileId: userId,
        roleId: '',
        defaultBranchId: null,
        isMasterActing: true,
      };
    }
  }

  return getUserCompanyMembership(supabase, companyId);
}

export async function hasCompanyPermission(
  supabase: SupabaseClient,
  companyId: string,
  permissionCode: string,
): Promise<boolean> {
  const {data, error} = await supabase.rpc('has_company_permission', {
    p_company_id: companyId,
    p_permission_code: permissionCode,
  });

  if (error) return false;
  return Boolean(data);
}

export async function assertCompanyPermission(
  supabase: SupabaseClient,
  companyId: string,
  permissionCode: string,
): Promise<boolean> {
  const allowed = await hasCompanyPermission(supabase, companyId, permissionCode);
  return allowed;
}

export async function requireCompanyMembership(
  supabase: SupabaseClient,
  companyId?: string,
): Promise<CompanyMembership> {
  const access = await getCompanyAccessContext(supabase, companyId);
  if (!access) {
    throw new Error('Empresa não encontrada ou acesso negado.');
  }
  return access;
}
