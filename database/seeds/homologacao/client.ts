import {createClient, type SupabaseClient} from '@supabase/supabase-js';

import type {Database} from '@/supabase/types';

import {requireHmlAuthEnv} from './env';

export type HmlSupabaseClient = SupabaseClient<Database>;

/**
 * Cliente autenticado como administrador da empresa (anon key + senha).
 * Não usa SUPABASE_SERVICE_ROLE_KEY.
 */
export async function createHmlAuthenticatedClient(): Promise<{
  supabase: HmlSupabaseClient;
  profileId: string;
  email: string;
}> {
  const env = requireHmlAuthEnv();

  const supabase = createClient<Database>(env.url, env.anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const {data, error} = await supabase.auth.signInWithPassword({
    email: env.adminEmail,
    password: env.adminPassword,
  });

  if (error || !data.user) {
    const code = error?.code ?? (data.user ? 'unknown' : 'no_user');
    const status =
      error && typeof error === 'object' && 'status' in error
        ? String((error as {status?: number}).status ?? '')
        : '';
    const raw = (error?.message ?? 'no user returned').slice(0, 160);
    const safe = raw
      .replace(/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, '[email]')
      .replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]+\b/g, '[jwt]')
      .replace(/\bsb_[a-z]+_[A-Za-z0-9_]+/g, '[key]');
    throw new Error(
      `Falha na autenticação HML (code=${code}${status ? ` status=${status}` : ''}): ${safe}`,
    );
  }

  return {
    supabase,
    profileId: data.user.id,
    email: data.user.email ?? env.adminEmail,
  };
}

export async function signOutHmlClient(supabase: HmlSupabaseClient): Promise<void> {
  await supabase.auth.signOut();
}
