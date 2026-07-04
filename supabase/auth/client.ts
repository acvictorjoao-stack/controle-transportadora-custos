import {createClient, resetBrowserClient} from '@/supabase/client';

import {normalizeAuthError} from '@/lib/auth/auth-errors';

export interface SignInCredentials {
  email: string;
  password: string;
}

/**
 * Helpers de autenticação para Client Components.
 */
export function getAuthClient() {
  return createClient();
}

export async function signInWithPassword(credentials: SignInCredentials) {
  const supabase = getAuthClient();

  const result = await supabase.auth.signInWithPassword({
    email: credentials.email.trim(),
    password: credentials.password,
  });

  if (result.error) {
    throw normalizeAuthError(result.error);
  }

  return result.data;
}

/** Limpa cache local do browser sem chamar API (prepara para signOutAction). */
export async function signOutClientLocal() {
  const supabase = getAuthClient();

  const {error} = await supabase.auth.signOut({scope: 'local'});

  if (error) {
    throw normalizeAuthError(error);
  }

  resetBrowserClient();
}

export async function signOutClient() {
  const supabase = getAuthClient();

  const {error} = await supabase.auth.signOut();

  resetBrowserClient();

  if (error) {
    throw normalizeAuthError(error);
  }
}

export async function getClientSession() {
  const supabase = getAuthClient();
  const {data, error} = await supabase.auth.getSession();

  if (error) {
    throw normalizeAuthError(error);
  }

  return data.session;
}

export async function getClientUser() {
  const supabase = getAuthClient();
  const {data, error} = await supabase.auth.getUser();

  if (error) {
    throw normalizeAuthError(error);
  }

  return data.user;
}

export function onAuthStateChange(
  callback: Parameters<
    ReturnType<typeof getAuthClient>['auth']['onAuthStateChange']
  >[0],
) {
  const supabase = getAuthClient();
  return supabase.auth.onAuthStateChange(callback);
}
