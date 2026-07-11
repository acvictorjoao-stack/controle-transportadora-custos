'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';

import {logPortalAudit, PORTAL_AUDIT_ACTIONS} from '@/features/master/audit';
import {normalizeAuthError} from '@/lib/auth/auth-errors';
import {isPortalOwner} from '@/lib/auth/portal';
import {
  DEFAULT_POST_LOGOUT_REDIRECT,
  resolvePostLoginRedirect,
  TENANT_ACCESS_DENIED_MESSAGE,
} from '@/lib/auth/redirect';
import {checkTenantAccess} from '@/lib/auth/tenant-access';
import {createClient} from '@/supabase/server';
import {createAdminClient} from '@/supabase/server/admin';

import type {SignInCredentials} from './client';

export interface AuthActionResult {
  success: boolean;
  error?: string;
}

/**
 * Server Action — login por e-mail e senha.
 * Grava cookies SSR via createServerClient (simétrico ao signOutAction).
 */
export async function signInAction(
  credentials: SignInCredentials,
  returnTo?: string,
): Promise<AuthActionResult> {
  const supabase = await createClient();

  const {data: beforeData} = await supabase.auth.getSession();

  if (beforeData.session) {
    await supabase.auth.signOut();
  }

  const {error} = await supabase.auth.signInWithPassword({
    email: credentials.email.trim(),
    password: credentials.password,
  });

  if (error) {
    const normalized = normalizeAuthError(error);
    return {success: false, error: normalized.message};
  }

  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (user) {
    const admin = createAdminClient();
    await admin
      .from('profiles')
      .update({last_login_at: new Date().toISOString()})
      .eq('id', user.id);
  }

  const isOwner = await isPortalOwner(supabase);

  if (!isOwner) {
    const access = await checkTenantAccess(supabase);

    if (!access.valid) {
      await supabase.auth.signOut();
      return {success: false, error: TENANT_ACCESS_DENIED_MESSAGE};
    }
  }

  if (isOwner && user) {
    await logPortalAudit({
      action: PORTAL_AUDIT_ACTIONS.LOGIN,
      actorProfileId: user.id,
      actorEmail: user.email ?? null,
    });
  }

  revalidatePath('/', 'layout');

  redirect(resolvePostLoginRedirect(returnTo, isOwner));
}

/**
 * Server Action — encerra a sessão atual e limpa cookies SSR.
 */
export async function signOutAction(): Promise<void> {
  const supabase = await createClient();

  const {
    data: {user},
  } = await supabase.auth.getUser();

  const isOwner = user ? await isPortalOwner(supabase) : false;

  const {error} = await supabase.auth.signOut();

  if (error) {
    throw normalizeAuthError(error);
  }

  if (isOwner && user) {
    await logPortalAudit({
      action: PORTAL_AUDIT_ACTIONS.LOGOUT,
      actorProfileId: user.id,
      actorEmail: user.email ?? null,
    });
  }

  revalidatePath('/', 'layout');
  redirect(DEFAULT_POST_LOGOUT_REDIRECT);
}
