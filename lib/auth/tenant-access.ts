import type {SupabaseClient} from '@supabase/supabase-js';
import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';

import {ROUTES} from '@/constants/routes/paths';
import {createClient} from '@/supabase/server';
import {measureMiddlewareSupabase} from '@/supabase/middleware/timing';

import {
  type CompanyMembership,
  getCompanyAccessContext,
  getUserCompanyMembership,
} from './company';
import {getMasterActingCompany} from './master-company-context';
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

async function validateActiveCompany(
  supabase: SupabaseClient,
  companyId: string,
): Promise<TenantAccessResult> {
  const {data, error} = await measureMiddlewareSupabase(
    supabase,
    'companies',
    'companies',
    () =>
      supabase
        .from('companies')
        .select('id, status')
        .eq('id', companyId)
        .is('deleted_at', null)
        .maybeSingle(),
  );

  if (error || !data) {
    return {valid: false, reason: 'company_missing', companyId};
  }

  if (data.status !== 'active') {
    return {valid: false, reason: 'company_inactive', companyId};
  }

  return {valid: true, companyId};
}

/**
 * Valida acesso tenant:
 * - Membros: membership ativa + empresa ativa
 * - Master: contexto portal_acting_companies validado (sem company_members)
 */
export async function checkTenantAccess(
  supabase: SupabaseClient,
): Promise<TenantAccessResult> {
  if (await isPortalOwner(supabase)) {
    const acting = await getMasterActingCompany(supabase);
    if (!acting) {
      return {valid: false, reason: 'no_membership'};
    }

    const companyCheck = await validateActiveCompany(supabase, acting.companyId);
    if (!companyCheck.valid) {
      return companyCheck;
    }

    const access = await getCompanyAccessContext(supabase, acting.companyId);
    if (!access) {
      return {valid: false, reason: 'no_membership', companyId: acting.companyId};
    }

    return {valid: true, membership: access, companyId: acting.companyId};
  }

  const membership = await getUserCompanyMembership(supabase);

  if (!membership) {
    return {valid: false, reason: 'no_membership'};
  }

  const companyCheck = await validateActiveCompany(
    supabase,
    membership.companyId,
  );

  if (!companyCheck.valid) {
    return {...companyCheck, membership};
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
 * Portal owners sem contexto de empresa vão para a tela de escolha (/acesso).
 */
export async function requireTenantAccess(
  supabase: SupabaseClient,
): Promise<CompanyMembership> {
  const access = await checkTenantAccess(supabase);

  if (access.valid && access.membership) {
    return access.membership;
  }

  if (await isPortalOwner(supabase)) {
    redirect(ROUTES.acesso);
  }

  return invalidateTenantSession(supabase);
}
