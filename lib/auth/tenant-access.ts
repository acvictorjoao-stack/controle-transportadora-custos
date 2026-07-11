import type {SupabaseClient} from '@supabase/supabase-js';
import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';

import {ROUTES} from '@/constants/routes/paths';
import {createClient} from '@/supabase/server';

import {
  type CompanyMembership,
  getUserCompanyMembership,
} from './company';
import {isPortalOwner} from './portal';
import {
  getTenantAccessDeniedLoginUrl,
  TENANT_ACCESS_DENIED_MESSAGE,
} from './redirect';

export {TENANT_ACCESS_DENIED_MESSAGE};

export type TenantAccessFailureReason =
  | 'no_membership'
  | 'company_missing'
  | 'company_inactive';

export interface TenantAccessResult {
  valid: boolean;
  reason?: TenantAccessFailureReason;
  membership?: CompanyMembership;
  companyId?: string;
}

/**
 * Valida se o usuário autenticado possui membership ativa
 * vinculada a uma empresa existente e ativa.
 */
export async function checkTenantAccess(
  supabase: SupabaseClient,
): Promise<TenantAccessResult> {
  const membership = await getUserCompanyMembership(supabase);

  if (!membership) {
    return {valid: false, reason: 'no_membership'};
  }

  const {data, error} = await supabase
    .from('companies')
    .select('id, status')
    .eq('id', membership.companyId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error || !data) {
    return {
      valid: false,
      reason: 'company_missing',
      companyId: membership.companyId,
    };
  }

  if (data.status !== 'active') {
    return {
      valid: false,
      reason: 'company_inactive',
      companyId: membership.companyId,
    };
  }

  return {valid: true, membership, companyId: membership.companyId};
}

/**
 * Alias de getUserCompanyMembership para auditoria e consistência de nomenclatura.
 */
export const getCurrentMembership = getUserCompanyMembership;

/**
 * Encerra a sessão Supabase e redireciona para login com mensagem amigável.
 */
export async function invalidateTenantSession(
  supabase?: SupabaseClient,
): Promise<never> {
  const client = supabase ?? (await createClient());
  await client.auth.signOut();
  revalidatePath('/', 'layout');
  redirect(getTenantAccessDeniedLoginUrl());
}

/**
 * Exige acesso tenant válido em Server Components.
 * Portal owners sem empresa são redirecionados para /master.
 */
export async function requireTenantAccess(
  supabase: SupabaseClient,
): Promise<CompanyMembership> {
  const access = await checkTenantAccess(supabase);

  if (access.valid && access.membership) {
    return access.membership;
  }

  if (await isPortalOwner(supabase)) {
    redirect(ROUTES.master);
  }

  return invalidateTenantSession(supabase);
}
