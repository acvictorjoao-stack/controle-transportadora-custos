import {ROUTES} from '@/constants/routes/paths';

/** Rotas públicas de autenticação (visitantes autenticados são redirecionados). */
export const AUTH_ROUTES = [ROUTES.login, ROUTES.recuperarSenha] as const;

/**
 * Rotas do fluxo de redefinição de senha.
 * Exigem sessão de recovery; autenticados NÃO são redirecionados para home/master.
 */
export const PASSWORD_UPDATE_ROUTES = [ROUTES.atualizarSenha] as const;

/** Rotas acessíveis sem sessão. */
export const PUBLIC_ROUTES = ['/api/health', ROUTES.authCallback] as const;

export const DEFAULT_POST_LOGIN_REDIRECT = ROUTES.home;
export const DEFAULT_POST_LOGOUT_REDIRECT = ROUTES.login;

export const TENANT_ACCESS_DENIED_REASON = 'tenant_invalid';

export const TENANT_ACCESS_DENIED_MESSAGE =
  'Empresa desativada ou removida. Faça login novamente ou entre em contato com o administrador.';

export const PASSWORD_RESET_SUCCESS_PARAM = 'passwordReset';
export const PASSWORD_RESET_SUCCESS_VALUE = 'success';

export const RECOVERY_LINK_INVALID_REASON = 'recovery_invalid';

export const RECOVERY_LINK_INVALID_MESSAGE =
  'Link de recuperação inválido ou expirado. Solicite um novo envio.';

export function getTenantAccessDeniedLoginUrl(): string {
  const params = new URLSearchParams({reason: TENANT_ACCESS_DENIED_REASON});
  return `${ROUTES.login}?${params.toString()}`;
}

export function getPasswordResetSuccessLoginUrl(): string {
  const params = new URLSearchParams({
    [PASSWORD_RESET_SUCCESS_PARAM]: PASSWORD_RESET_SUCCESS_VALUE,
  });
  return `${ROUTES.login}?${params.toString()}`;
}

export function getRecoveryInvalidLoginUrl(): string {
  const params = new URLSearchParams({reason: RECOVERY_LINK_INVALID_REASON});
  return `${ROUTES.login}?${params.toString()}`;
}

export function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function isPasswordUpdateRoute(pathname: string): boolean {
  return PASSWORD_UPDATE_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function isProtectedRoute(pathname: string): boolean {
  return (
    !isAuthRoute(pathname) &&
    !isPublicRoute(pathname) &&
    !isPasswordUpdateRoute(pathname)
  );
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

  if (isAuthRoute(returnTo) || isPasswordUpdateRoute(returnTo)) {
    return DEFAULT_POST_LOGIN_REDIRECT;
  }

  return returnTo;
}

/** Rotas do Portal Master (/master/*). */
export function isMasterRoute(pathname: string): boolean {
  return pathname === ROUTES.master || pathname.startsWith(`${ROUTES.master}/`);
}

/** Tela de escolha de acesso do Master (/acesso*). */
export function isAccessChoiceRoute(pathname: string): boolean {
  return (
    pathname === ROUTES.acesso || pathname.startsWith(`${ROUTES.acesso}/`)
  );
}

/**
 * Define destino pós-login com base no papel do Portal Master.
 * OWNER vai para a tela de escolha (/acesso), exceto returnTo master/acesso.
 */
export function resolvePostLoginRedirect(
  returnTo: string | null | undefined,
  isOwner: boolean,
): string {
  const safeReturnTo = getSafeReturnTo(returnTo);

  if (isOwner) {
    if (isMasterRoute(safeReturnTo) || isAccessChoiceRoute(safeReturnTo)) {
      return safeReturnTo;
    }

    return ROUTES.acesso;
  }

  if (isMasterRoute(safeReturnTo) || isAccessChoiceRoute(safeReturnTo)) {
    return DEFAULT_POST_LOGIN_REDIRECT;
  }

  return safeReturnTo;
}
