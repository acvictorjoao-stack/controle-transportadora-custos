import type {SupabaseClient} from '@supabase/supabase-js';

import {createClient} from '@/supabase/server';

export const COMPANY_ACCESS_DENIED =
  'Você não tem permissão para realizar esta ação nesta empresa.';

export interface CompanyMembership {
  companyId: string;
  profileId: string;
  roleId: string;
  defaultBranchId: string | null;
}

export async function getServerSupabaseClient() {
  return createClient();
}

export async function getCurrentUserId(
  supabase: SupabaseClient,
): Promise<string | null> {
  const {data, error} = await supabase.auth.getUser();
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

  const {data, error} = await query.maybeSingle();

  if (error || !data) return null;

  return {
    companyId: data.company_id,
    profileId: data.profile_id,
    roleId: data.role_id,
    defaultBranchId: data.default_branch_id,
  };
}

export async function getCurrentCompanyId(
  supabase: SupabaseClient,
): Promise<string | null> {
  const membership = await getUserCompanyMembership(supabase);
  return membership?.companyId ?? null;
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
  const membership = await getUserCompanyMembership(supabase, companyId);
  if (!membership) {
    throw new Error('Empresa não encontrada ou acesso negado.');
  }
  return membership;
}
