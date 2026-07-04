import type {SupabaseClient} from '@supabase/supabase-js';

import {type PortalRole} from '@/lib/auth/permissions';
import {getServerSupabase, getServerUser} from '@/supabase/auth/server';
import type {Database} from '@/supabase/types';
import type {PortalUser} from '@/types/portal/user';

type Supabase = SupabaseClient<Database>;

function portalUserFromRole(
  profileId: string,
  role: PortalRole,
): PortalUser {
  return {
    id: profileId,
    profile_id: profileId,
    role,
    active: true,
    created_at: '',
    updated_at: '',
  };
}

async function resolveAuthUserId(
  client: Supabase,
  supabase?: Supabase,
): Promise<string | null> {
  if (supabase) {
    const {
      data: {user},
    } = await client.auth.getUser();
    return user?.id ?? null;
  }

  const user = await getServerUser();
  return user?.id ?? null;
}

async function rpcGetMyPortalRole(client: Supabase): Promise<PortalRole | null> {
  const {data, error} = await client.rpc('get_my_portal_role');

  if (error) {
    throw error;
  }

  return (data as PortalRole | null) ?? null;
}

async function rpcIsPortalOwner(client: Supabase): Promise<boolean> {
  const {data, error} = await client.rpc('is_portal_owner');

  if (error) {
    throw error;
  }

  return Boolean(data);
}

/**
 * Busca o papel do Portal Master do usuário autenticado via RPC.
 */
export async function getMyPortalRole(
  supabase?: Supabase,
): Promise<PortalRole | null> {
  const client = supabase ?? (await getServerSupabase());
  const profileId = await resolveAuthUserId(client, supabase);

  if (!profileId) {
    return null;
  }

  return rpcGetMyPortalRole(client);
}

/**
 * Busca o registro sintético de portal_users do usuário autenticado.
 * Usa get_my_portal_role() — não consulta a tabela diretamente.
 */
export async function getPortalUser(
  supabase?: Supabase,
): Promise<PortalUser | null> {
  const client = supabase ?? (await getServerSupabase());
  const profileId = await resolveAuthUserId(client, supabase);

  if (!profileId) {
    return null;
  }

  const role = await rpcGetMyPortalRole(client);

  if (!role) {
    return null;
  }

  return portalUserFromRole(profileId, role);
}

/**
 * Verifica se o usuário autenticado é OWNER da plataforma via RPC.
 */
export async function isPortalOwner(
  supabase?: Supabase,
): Promise<boolean> {
  const client = supabase ?? (await getServerSupabase());
  const profileId = await resolveAuthUserId(client, supabase);

  if (!profileId) {
    return false;
  }

  return rpcIsPortalOwner(client);
}
