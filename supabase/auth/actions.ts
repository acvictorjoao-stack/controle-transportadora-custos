'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';

import {ROUTES} from '@/constants/routes/paths';
import {logPortalAudit, PORTAL_AUDIT_ACTIONS} from '@/features/master/audit';
import {DEFAULT_PASSWORD_POLICY} from '@/features/master/settings/types';
import {getAppBaseUrl} from '@/lib/auth/app-url';
import {AuthError, logAuthError, normalizeAuthError} from '@/lib/auth/auth-errors';
import {isPortalOwner} from '@/lib/auth/portal';
import {
  DEFAULT_POST_LOGOUT_REDIRECT,
  getPasswordResetSuccessLoginUrl,
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
  message?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PASSWORD_RESET_REQUEST_SUCCESS_MESSAGE =
  'Se o e-mail estiver cadastrado, enviaremos um link para redefinir sua senha.';

function validateNewPassword(password: string): string | null {
  const minLength = DEFAULT_PASSWORD_POLICY.min_length;

  if (!password) {
    return 'Informe a nova senha.';
  }

  if (password.length < minLength) {
    return `A senha deve ter pelo menos ${minLength} caracteres.`;
  }

  if (DEFAULT_PASSWORD_POLICY.require_uppercase && !/[A-Z]/.test(password)) {
    return 'A senha deve conter pelo menos uma letra maiúscula.';
  }

  if (DEFAULT_PASSWORD_POLICY.require_lowercase && !/[a-z]/.test(password)) {
    return 'A senha deve conter pelo menos uma letra minúscula.';
  }

  if (DEFAULT_PASSWORD_POLICY.require_number && !/\d/.test(password)) {
    return 'A senha deve conter pelo menos um número.';
  }

  if (
    DEFAULT_PASSWORD_POLICY.require_special &&
    !/[^A-Za-z0-9]/.test(password)
  ) {
    return 'A senha deve conter pelo menos um caractere especial.';
  }

  return null;
}

/**
 * Server Action — login por e-mail e senha.
 * Grava cookies SSR via createServerClient (simétrico ao signOutAction).
 */
export async function signInAction(
  credentials: SignInCredentials,
  returnTo?: string,
): Promise<AuthActionResult> {
  const email = credentials.email.trim();
  const supabase = await createClient();

  const {data: beforeData} = await supabase.auth.getSession();

  if (beforeData.session) {
    await supabase.auth.signOut();
  }

  const {error} = await supabase.auth.signInWithPassword({
    email,
    password: credentials.password,
  });

  if (error) {
    const normalized = logAuthError(error, 'signInWithPassword');
    return {success: false, error: normalized.message};
  }

  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (user) {
    try {
      const admin = createAdminClient();
      await admin
        .from('profiles')
        .update({last_login_at: new Date().toISOString()})
        .eq('id', user.id);
    } catch {
      // Não bloquear autenticação por falha de service_role / update auxiliar.
    }
  }

  let isOwner = false;
  try {
    isOwner = await isPortalOwner(supabase);
  } catch (portalError) {
    logAuthError(portalError, 'signIn.portalOwner');
    await supabase.auth.signOut();
    return {
      success: false,
      error: 'Não foi possível validar o perfil do portal. Tente novamente.',
    };
  }

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

  const destination = resolvePostLoginRedirect(returnTo, isOwner);

  revalidatePath('/', 'layout');

  redirect(destination);
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

/**
 * Server Action — solicita e-mail de recuperação de senha (Portal Owner e tenants).
 * Resposta genérica para evitar enumeração de e-mails.
 */
export async function requestPasswordResetAction(
  email: string,
): Promise<AuthActionResult> {
  const trimmedEmail = email.trim().toLowerCase();

  if (!trimmedEmail) {
    return {success: false, error: 'Informe seu e-mail.'};
  }

  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return {success: false, error: 'E-mail inválido.'};
  }

  const supabase = await createClient();
  const appUrl = await getAppBaseUrl();
  const redirectTo = `${appUrl}${ROUTES.authCallback}?next=${encodeURIComponent(ROUTES.atualizarSenha)}`;

  const {error} = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
    redirectTo,
  });

  if (error) {
    const normalized = logAuthError(error, 'resetPasswordForEmail');

    if (
      normalized.code === 'RATE_LIMITED' ||
      normalized.code === 'NETWORK_ERROR'
    ) {
      return {success: false, error: normalized.message};
    }

    // Demais erros: resposta genérica (não vazar existência do e-mail).
    return {
      success: true,
      message: PASSWORD_RESET_REQUEST_SUCCESS_MESSAGE,
    };
  }

  return {
    success: true,
    message: PASSWORD_RESET_REQUEST_SUCCESS_MESSAGE,
  };
}

/**
 * Server Action — define nova senha após sessão de recovery do Supabase.
 */
export async function updatePasswordAction(
  password: string,
  confirmPassword: string,
): Promise<AuthActionResult> {
  const validationError = validateNewPassword(password);
  if (validationError) {
    return {success: false, error: validationError};
  }

  if (password !== confirmPassword) {
    return {success: false, error: 'As senhas não coincidem.'};
  }

  const supabase = await createClient();

  const {
    data: {user},
    error: getUserError,
  } = await supabase.auth.getUser();

  if (getUserError || !user) {
    const normalized = getUserError
      ? logAuthError(getUserError, 'updatePassword.getUser')
      : new AuthError(
          'Link de recuperação inválido ou expirado. Solicite um novo envio.',
          'RECOVERY_LINK_INVALID',
        );

    return {success: false, error: normalized.message};
  }

  const {error} = await supabase.auth.updateUser({password});

  if (error) {
    const normalized = logAuthError(error, 'updatePassword');
    return {success: false, error: normalized.message};
  }

  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect(getPasswordResetSuccessLoginUrl());
}

