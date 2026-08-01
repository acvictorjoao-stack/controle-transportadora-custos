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
import {getSupabaseEnv} from '@/supabase/utils/env';

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

/** TEMP — diagnóstico de login. Remover após identificar a causa. Não loga senha/token. */
function authDebug(stage: string, payload: Record<string, unknown> = {}) {
  const safeEmail =
    typeof payload.email === 'string'
      ? payload.email.replace(/(^.).*(@.*$)/, '$1***$2')
      : undefined;

  console.info('[AUTH_DEBUG]', {
    stage,
    at: new Date().toISOString(),
    ...payload,
    ...(safeEmail ? {email: safeEmail} : {}),
  });
}

function detectKeyFormat(value: string | undefined): string {
  const key = value?.trim() ?? '';
  if (!key) return 'missing';
  if (key.startsWith('eyJ')) return 'legacy_jwt';
  if (key.startsWith('sb_publishable_')) return 'sb_publishable';
  if (key.startsWith('sb_secret_')) return 'sb_secret';
  return 'unknown';
}

function describeSupabaseTarget() {
  try {
    const {url, anonKey} = getSupabaseEnv();
    const host = new URL(url).host;
    const serviceRaw = process.env.SUPABASE_SERVICE_ROLE_KEY;
    return {
      supabaseHost: host,
      anonKeyFormat: detectKeyFormat(anonKey),
      anonKeyLen: anonKey.length,
      serviceRoleDefined: serviceRaw !== undefined,
      serviceRolePresent: Boolean(serviceRaw?.trim()),
      serviceRoleFormat: detectKeyFormat(serviceRaw),
      serviceRoleLen: serviceRaw?.trim()?.length ?? 0,
    };
  } catch (error) {
    return {
      supabaseEnvError:
        error instanceof Error ? error.message : 'failed_to_read_supabase_env',
    };
  }
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

  authDebug('start', {
    email,
    returnTo: returnTo ?? null,
    ...describeSupabaseTarget(),
  });

  const supabase = await createClient();

  const {data: beforeData} = await supabase.auth.getSession();
  authDebug('pre_session', {
    hadSession: Boolean(beforeData.session),
  });

  if (beforeData.session) {
    await supabase.auth.signOut();
    authDebug('cleared_existing_session');
  }

  const {data: signInData, error} = await supabase.auth.signInWithPassword({
    email,
    password: credentials.password,
  });

  if (error) {
    authDebug('signInWithPassword_error', {
      name: error.name,
      message: error.message,
      status: error.status ?? null,
      code: (error as {code?: string}).code ?? null,
      hint:
        /invalid jwt|invalid token format/i.test(error.message)
          ? 'Possível incompatibilidade: chave sb_publishable_/sb_secret_ enviada como Bearer. Teste as Legacy API Keys (anon/service_role JWT) no .env.local.'
          : null,
    });
    const normalized = normalizeAuthError(error);
    return {success: false, error: normalized.message};
  }

  authDebug('signInWithPassword_ok', {
    userId: signInData.user?.id ?? null,
    hasSession: Boolean(signInData.session),
    expiresAt: signInData.session?.expires_at ?? null,
  });

  const {
    data: {user},
    error: getUserError,
  } = await supabase.auth.getUser();

  authDebug('getUser', {
    userId: user?.id ?? null,
    email: user?.email ?? null,
    getUserError: getUserError
      ? {
          message: getUserError.message,
          status: getUserError.status ?? null,
          code: (getUserError as {code?: string}).code ?? null,
        }
      : null,
  });

  if (user) {
    try {
      const admin = createAdminClient();
      const {error: profileError} = await admin
        .from('profiles')
        .update({last_login_at: new Date().toISOString()})
        .eq('id', user.id);

      authDebug('last_login_update', {
        ok: !profileError,
        error: profileError
          ? {
              message: profileError.message,
              code: profileError.code,
              details: profileError.details,
            }
          : null,
      });
    } catch (adminError) {
      // Não bloquear autenticação por falha de service_role / update auxiliar.
      authDebug('last_login_update_threw', {
        message:
          adminError instanceof Error ? adminError.message : 'unknown_admin_error',
        name: adminError instanceof Error ? adminError.name : typeof adminError,
      });
    }
  }

  let isOwner = false;
  try {
    isOwner = await isPortalOwner(supabase);
    authDebug('portal_owner_check', {isOwner});
  } catch (portalError) {
    authDebug('portal_owner_check_threw', {
      message:
        portalError instanceof Error ? portalError.message : 'unknown_portal_error',
      name: portalError instanceof Error ? portalError.name : typeof portalError,
    });
    await supabase.auth.signOut();
    return {
      success: false,
      error: 'Não foi possível validar o perfil do portal. Tente novamente.',
    };
  }

  if (!isOwner) {
    const access = await checkTenantAccess(supabase);
    authDebug('tenant_access', {
      valid: access.valid,
      reason: access.reason ?? null,
      companyId: access.companyId ?? null,
    });

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
  authDebug('redirect', {destination, isOwner});

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

