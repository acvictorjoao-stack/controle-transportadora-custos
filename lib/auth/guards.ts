import {redirect} from 'next/navigation';

import {ROUTES} from '@/constants/routes/paths';
import {getServerSession, getServerUser} from '@/supabase/auth/server';

import {AuthError, logAuthError} from './auth-errors';
import {isPortalOwner} from './portal';
import {DEFAULT_POST_LOGIN_REDIRECT, getLoginUrl, getSafeReturnTo} from './redirect';

/**
 * Recupera o usuário autenticado no servidor.
 * Retorna null se não houver sessão válida.
 */
export async function getAuthUser() {
  return getServerUser();
}

/**
 * Exige autenticação em Server Components / Actions.
 * Redireciona para login se a sessão estiver ausente ou expirada.
 */
export async function requireAuth(returnTo?: string) {
  const user = await getServerUser();

  if (!user) {
    redirect(getLoginUrl(returnTo));
  }

  return user;
}

/**
 * Redireciona usuários autenticados para fora de rotas de auth (ex.: /login).
 */
export async function redirectIfAuthenticated(
  redirectTo: string = DEFAULT_POST_LOGIN_REDIRECT,
) {
  const session = await getServerSession();

  if (session) {
    redirect(getSafeReturnTo(redirectTo));
  }
}

/**
 * Valida sessão e lança AuthError para integração com ErrorBoundary.
 */
export async function assertAuthenticated(): Promise<void> {
  const user = await getServerUser();

  if (!user) {
    const error = new AuthError(
      'Sua sessão expirou. Faça login novamente.',
      'SESSION_EXPIRED',
    );
    logAuthError(error, 'assertAuthenticated');
    throw error;
  }
}

/**
 * Exige papel OWNER do Portal Master (RPC is_portal_owner).
 */
export const PORTAL_ACCESS_DENIED = 'Acesso negado.';

/**
 * Valida acesso OWNER em Server Actions do Portal Master.
 */
export async function guardPortalOwner(): Promise<boolean> {
  return isPortalOwner();
}

/**
 * Exige papel OWNER do Portal Master (RPC is_portal_owner).
 * Redireciona usuários sem permissão para o dashboard do tenant.
 */
export async function requireOwner(returnTo?: string) {
  const user = await requireAuth(returnTo);

  if (!(await guardPortalOwner())) {
    redirect(ROUTES.dashboard);
  }

  return user;
}

export {ROUTES};
