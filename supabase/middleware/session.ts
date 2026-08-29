import {createServerClient} from '@supabase/ssr';
import {type NextRequest, NextResponse} from 'next/server';

import {ROUTES} from '@/constants/routes/paths';
import {
  isAccessChoiceRoute,
  isAuthRoute,
  isMasterRoute,
  isPasswordUpdateRoute,
  isProtectedRoute,
  resolvePostLoginRedirect,
  TENANT_ACCESS_DENIED_REASON,
} from '@/lib/auth/redirect';
import {checkTenantAccess} from '@/lib/auth/tenant-access';
import type {Database} from '@/supabase/types';
import {
  logMiddlewareStep,
  logMiddlewareStepForClient,
  logMiddlewareTotal,
  logMiddlewareStart,
  measureMiddlewareSupabase,
  registerMiddlewareTimingContext,
  createMiddlewareRequestId,
  type MiddlewareTimingContext,
} from '@/supabase/middleware/timing';

type PortalRole = 'OWNER' | 'SUPPORT' | 'FINANCE';

type MiddlewareSupabase = ReturnType<typeof createServerClient<Database>>;

function createMissingSupabaseEnvResponse(): NextResponse {
  const missing: string[] = [];

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) {
    missing.push('NEXT_PUBLIC_SUPABASE_URL');
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()) {
    missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  const message =
    `Configuração inválida: variáveis de ambiente ausentes (${missing.join(', ')}). ` +
    'Configure-as em .env.local antes de iniciar a aplicação.';

  return new NextResponse(message, {
    status: 500,
    headers: {'Content-Type': 'text/plain; charset=utf-8'},
  });
}

function getMiddlewareSupabaseEnv(): {
  url: string;
  anonKey: string;
} | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    return null;
  }

  return {url, anonKey};
}

async function fetchPortalUserRole(
  supabase: MiddlewareSupabase,
): Promise<PortalRole | null> {
  const startedAt = performance.now();

  try {
    const {data, error} = await measureMiddlewareSupabase(
      supabase,
      'get_my_portal_role',
      'portal_role',
      () => supabase.rpc('get_my_portal_role'),
    );

    if (error) {
      return null;
    }

    return (data as PortalRole | null) ?? null;
  } finally {
    logMiddlewareStepForClient(supabase, 'portal_role', startedAt);
  }
}

function copyCookies(source: NextResponse, target: NextResponse): void {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie);
  });
}

function buildRedirectWithCookies(
  request: NextRequest,
  supabaseResponse: NextResponse,
  pathname: string,
): NextResponse {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = pathname;
  redirectUrl.search = '';

  const redirectResponse = NextResponse.redirect(redirectUrl);
  copyCookies(supabaseResponse, redirectResponse);
  return redirectResponse;
}

async function invalidateSessionAndRedirectToLogin(
  supabase: MiddlewareSupabase,
  request: NextRequest,
  supabaseResponse: NextResponse,
  timingContext: MiddlewareTimingContext,
): Promise<NextResponse> {
  await measureMiddlewareSupabase(
    supabase,
    'auth.signOut',
    'auth_signOut',
    () => supabase.auth.signOut(),
  );

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = ROUTES.login;
  loginUrl.search = '';
  loginUrl.searchParams.set('reason', TENANT_ACCESS_DENIED_REASON);

  const redirectStartedAt = performance.now();
  const redirectResponse = NextResponse.redirect(loginUrl);
  copyCookies(supabaseResponse, redirectResponse);
  logMiddlewareStep(timingContext, 'redirect', redirectStartedAt);
  return redirectResponse;
}

async function hasValidTenantAccess(
  supabase: MiddlewareSupabase,
): Promise<boolean> {
  const startedAt = performance.now();

  try {
    const access = await checkTenantAccess(supabase);
    return access.valid;
  } finally {
    logMiddlewareStepForClient(supabase, 'tenant_access', startedAt);
  }
}

/**
 * Atualiza a sessão Supabase no middleware.
 *
 * Responsabilidades:
 * - Leitura de sessão via cookies
 * - Refresh automático de tokens (getUser)
 * - Proteção de rotas autenticadas
 * - Redirecionamento de OWNER para /master após login
 * - Bloqueio de /master/* para não-OWNER
 */
function buildAuthCallbackFunnelUrl(request: NextRequest): URL | null {
  const {pathname, searchParams} = request.nextUrl;
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');

  if ((!code && !tokenHash) || pathname === ROUTES.authCallback) {
    return null;
  }

  const callbackUrl = request.nextUrl.clone();
  callbackUrl.pathname = ROUTES.authCallback;

  const type = searchParams.get('type');
  if (
    !searchParams.get('next') &&
    (type === 'recovery' || Boolean(tokenHash) || Boolean(code))
  ) {
    callbackUrl.searchParams.set('next', ROUTES.atualizarSenha);
  }

  return callbackUrl;
}

export async function updateSession(
  request: NextRequest,
  requestId = createMiddlewareRequestId(),
) {
  const timingContext: MiddlewareTimingContext = {
    requestId,
    pathname: request.nextUrl.pathname,
  };
  const startedAt = performance.now();
  let result: 'success' | 'error' = 'success';

  logMiddlewareStart(timingContext, startedAt, request.method);

  try {
    return await updateSessionInternal(request, timingContext);
  } catch (error) {
    result = 'error';
    throw error;
  } finally {
    logMiddlewareTotal(
      timingContext,
      startedAt,
      result,
      result === 'error' ? 'exception' : undefined,
    );
  }
}

async function updateSessionInternal(
  request: NextRequest,
  timingContext: MiddlewareTimingContext,
) {
  const supabaseEnv = getMiddlewareSupabaseEnv();

  if (!supabaseEnv) {
    return createMissingSupabaseEnvResponse();
  }

  const authCallbackFunnel = buildAuthCallbackFunnelUrl(request);
  if (authCallbackFunnel) {
    const redirectStartedAt = performance.now();
    const redirectResponse = NextResponse.redirect(authCallbackFunnel);
    logMiddlewareStep(timingContext, 'redirect', redirectStartedAt);
    return redirectResponse;
  }

  let supabaseResponse = NextResponse.next({request});

  const supabase = createServerClient<Database>(
    supabaseEnv.url,
    supabaseEnv.anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({name, value}) => {
            request.cookies.set(name, value);
          });

          supabaseResponse = NextResponse.next({request});

          cookiesToSet.forEach(({name, value, options}) => {
            supabaseResponse.cookies.set(name, value, options);
          });

          Object.entries(headers).forEach(([key, value]) => {
            supabaseResponse.headers.set(key, value);
          });
        },
      },
    },
  );
  registerMiddlewareTimingContext(supabase, timingContext);

  const {
    data: {user},
  } = await measureMiddlewareSupabase(
    supabase,
    'auth.getUser',
    'auth_getUser',
    () => supabase.auth.getUser(),
  );

  const {pathname} = request.nextUrl;

  if (isPasswordUpdateRoute(pathname)) {
    // Sem exigir user aqui: hash #access_token é invisível ao middleware;
    // a página valida sessão (cookies pós-callback ou fragment no client).
    return supabaseResponse;
  }

  if (!user && isProtectedRoute(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = ROUTES.login;
    loginUrl.searchParams.set('returnTo', pathname);
    const redirectStartedAt = performance.now();
    const redirectResponse = NextResponse.redirect(loginUrl);
    logMiddlewareStep(timingContext, 'redirect', redirectStartedAt);
    return redirectResponse;
  }

  if (user && isProtectedRoute(pathname) && !isMasterRoute(pathname)) {
    const role = await fetchPortalUserRole(supabase);

    // OWNER: tenant validity is via portal_acting_companies (layout), not membership.
    // Non-owner: must have active company membership.
    if (role !== 'OWNER' && !(await hasValidTenantAccess(supabase))) {
      return invalidateSessionAndRedirectToLogin(
        supabase,
        request,
        supabaseResponse,
        timingContext,
      );
    }
  }

  if (user && (isMasterRoute(pathname) || isAccessChoiceRoute(pathname))) {
    const role = await fetchPortalUserRole(supabase);

    if (role !== 'OWNER') {
      const redirectStartedAt = performance.now();
      const redirectResponse = buildRedirectWithCookies(
        request,
        supabaseResponse,
        ROUTES.home,
      );
      logMiddlewareStep(timingContext, 'redirect', redirectStartedAt);
      return redirectResponse;
    }
  }

  if (user && isAuthRoute(pathname)) {
    const role = await fetchPortalUserRole(supabase);

    if (role !== 'OWNER' && !(await hasValidTenantAccess(supabase))) {
      return supabaseResponse;
    }

    const returnTo = request.nextUrl.searchParams.get('returnTo');
    const destination = resolvePostLoginRedirect(
      returnTo,
      role === 'OWNER',
    );

    const redirectStartedAt = performance.now();
    const redirectResponse = buildRedirectWithCookies(
      request,
      supabaseResponse,
      destination,
    );
    logMiddlewareStep(timingContext, 'redirect', redirectStartedAt);
    return redirectResponse;
  }

  return supabaseResponse;
}
