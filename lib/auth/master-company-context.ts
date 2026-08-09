import type {SupabaseClient} from '@supabase/supabase-js';

import {isPortalOwner} from '@/lib/auth/portal';
import {createClient} from '@/supabase/server';
import type {Database} from '@/supabase/types';

type Supabase = SupabaseClient<Database>;

export interface MasterActingCompany {
  companyId: string;
  companyName: string;
}

/**
 * Returns the Master-selected company context, if any.
 * Validated against active, non-deleted companies. Never trusts client input.
 */
export async function getMasterActingCompany(
  supabase?: Supabase,
): Promise<MasterActingCompany | null> {
  const client = supabase ?? (await createClient());

  if (!(await isPortalOwner(client))) {
    return null;
  }

  const {data: acting, error: actingError} = await client
    .from('portal_acting_companies')
    .select('company_id')
    .maybeSingle();

  if (actingError || !acting?.company_id) {
    return null;
  }

  const {data: company, error: companyError} = await client
    .from('companies')
    .select('id, trade_name, legal_name, status')
    .eq('id', acting.company_id)
    .is('deleted_at', null)
    .maybeSingle();

  if (companyError || !company || company.status !== 'active') {
    return null;
  }

  const companyName =
    (company.trade_name?.trim() || company.legal_name?.trim() || 'Empresa') ??
    'Empresa';

  return {
    companyId: company.id,
    companyName,
  };
}

export async function getMasterActingCompanyId(
  supabase?: Supabase,
): Promise<string | null> {
  const acting = await getMasterActingCompany(supabase);
  return acting?.companyId ?? null;
}

/**
 * Sets Master → company context after server-side validation.
 * Does NOT create company_members. Does NOT change portal_users / profiles.role.
 */
export async function setMasterActingCompany(
  companyId: string,
  supabase?: Supabase,
): Promise<{ok: true; company: MasterActingCompany} | {ok: false; error: string}> {
  const client = supabase ?? (await createClient());

  if (!(await isPortalOwner(client))) {
    return {ok: false, error: 'Acesso negado.'};
  }

  const {
    data: {user},
  } = await client.auth.getUser();

  if (!user) {
    return {ok: false, error: 'Sessão inválida.'};
  }

  const {data: company, error: companyError} = await client
    .from('companies')
    .select('id, trade_name, legal_name, status')
    .eq('id', companyId)
    .is('deleted_at', null)
    .maybeSingle();

  if (companyError || !company) {
    return {ok: false, error: 'Empresa não encontrada ou acesso negado.'};
  }

  if (company.status !== 'active') {
    return {ok: false, error: 'Empresa inativa. Selecione outra empresa.'};
  }

  const {error: upsertError} = await client.from('portal_acting_companies').upsert(
    {
      profile_id: user.id,
      company_id: company.id,
    },
    {onConflict: 'profile_id'},
  );

  if (upsertError) {
    return {ok: false, error: upsertError.message};
  }

  const companyName =
    company.trade_name?.trim() || company.legal_name?.trim() || 'Empresa';

  return {
    ok: true,
    company: {companyId: company.id, companyName},
  };
}

/** Clears Master → company context without signing out. */
export async function clearMasterActingCompany(
  supabase?: Supabase,
): Promise<void> {
  const client = supabase ?? (await createClient());

  if (!(await isPortalOwner(client))) {
    return;
  }

  const {
    data: {user},
  } = await client.auth.getUser();

  if (!user) return;

  await client
    .from('portal_acting_companies')
    .delete()
    .eq('profile_id', user.id);
}
