import {ROUTES} from '@/constants/routes/paths';

/** Rotas públicas de autenticação (visitantes autenticados são redirecionados). */
export const AUTH_ROUTES = [ROUTES.login, ROUTES.recuperarSenha] as const;

/** Rotas acessíveis sem sessão. */
export const PUBLIC_ROUTES = ['/api/health'] as const;

export const DEFAULT_POST_LOGIN_REDIRECT = ROUTES.home;
export const DEFAULT_POST_LOGOUT_REDIRECT = ROUTES.login;

export const TENANT_ACCESS_DENIED_REASON = 'tenant_invalid';

export const TENANT_ACCESS_DENIED_MESSAGE =
  'Empresa desativada ou removida. Faça login novamente ou entre em contato com o administrador.';

export function getTenantAccessDeniedLoginUrl(): string {
  const params = new URLSearchParams({reason: TENANT_ACCESS_DENIED_REASON});
  return `${ROUTES.login}?${params.toString()}`;
}

export function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function isProtectedRoute(pathname: string): boolean {
  return !isAuthRoute(pathname) && !isPublicRoute(pathname);
}

export function getLoginUrl(returnTo?: string): string {
  if (!returnTo || returnTo === ROUTES.login) {
    return ROUTES.login;
  }

  const params = new URLSearchParams({returnTo});
  return `${ROUTES.login}?${params.toString()}`;
}

export function getSafeReturnTo(returnTo: string | null | undefined): string {
  if (!returnTo || !returnTo.startsWith('/') || returnTo.startsWith('//')) {
    return DEFAULT_POST_LOGIN_REDIRECT;
  }

  if (isAuthRoute(returnTo)) {
    return DEFAULT_POST_LOGIN_REDIRECT;
  }

  return returnTo;
}

/** Rotas do Portal Master (/master/*). */
export function isMasterRoute(pathname: string): boolean {
  return pathname === ROUTES.master || pathname.startsWith(`${ROUTES.master}/`);
}

/**
 * Define destino pós-login com base no papel do Portal Master.
 * OWNER é redirecionado para /master, exceto se returnTo já for rota master.
 */
export function resolvePostLoginRedirect(
  returnTo: string | null | undefined,
  isOwner: boolean,
): string {
  const safeReturnTo = getSafeReturnTo(returnTo);

  if (isOwner) {
    if (isMasterRoute(safeReturnTo)) {
      return safeReturnTo;
    }

    return ROUTES.master;
  }

  if (isMasterRoute(safeReturnTo)) {
    return DEFAULT_POST_LOGIN_REDIRECT;
  }

  return safeReturnTo;
}
