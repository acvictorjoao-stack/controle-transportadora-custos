import {createServerClient} from '@supabase/ssr';
import {type NextRequest, NextResponse} from 'next/server';

import {ROUTES} from '@/constants/routes/paths';
import {
  isAuthRoute,
  isMasterRoute,
  isProtectedRoute,
  resolvePostLoginRedirect,
} from '@/lib/auth/redirect';
import type {Database} from '@/supabase/types';

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
  const {data, error} = await supabase.rpc('get_my_portal_role');

  if (error) {
    return null;
  }

  return (data as PortalRole | null) ?? null;
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
export async function updateSession(request: NextRequest) {
  const supabaseEnv = getMiddlewareSupabaseEnv();

  if (!supabaseEnv) {
    return createMissingSupabaseEnvResponse();
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

  const {
    data: {user},
  } = await supabase.auth.getUser();

  const {pathname} = request.nextUrl;

  if (!user && isProtectedRoute(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = ROUTES.login;
    loginUrl.searchParams.set('returnTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && isMasterRoute(pathname)) {
    const role = await fetchPortalUserRole(supabase);

    if (role !== 'OWNER') {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = ROUTES.dashboard;
      redirectUrl.search = '';
      return NextResponse.redirect(redirectUrl);
    }
  }

  if (user && isAuthRoute(pathname)) {
    const role = await fetchPortalUserRole(supabase);
    const returnTo = request.nextUrl.searchParams.get('returnTo');
    const destination = resolvePostLoginRedirect(
      returnTo,
      role === 'OWNER',
    );

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = destination;
    redirectUrl.search = '';
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
