import {createClient} from '@/supabase/server';
import {normalizeAuthError} from '@/lib/auth/auth-errors';

/**
 * Helpers de autenticação para Server Components.
 * Utiliza o cliente server da Sprint 4.
 */
export async function getServerSupabase() {
  return createClient();
}

export async function getServerSession() {
  const supabase = await getServerSupabase();
  const {data, error} = await supabase.auth.getSession();

  if (error) {
    throw normalizeAuthError(error);
  }

  return data.session;
}

export async function getServerUser() {
  const supabase = await getServerSupabase();
  const {data, error} = await supabase.auth.getUser();

  if (error) {
    throw normalizeAuthError(error);
  }

  return data.user;
}
