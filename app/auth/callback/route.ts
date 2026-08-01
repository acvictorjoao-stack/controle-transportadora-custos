import {type NextRequest, NextResponse} from 'next/server';

import {ROUTES} from '@/constants/routes/paths';
import {
  getRecoveryInvalidLoginUrl,
  isPasswordUpdateRoute,
} from '@/lib/auth/redirect';
import {createRouteHandlerClient} from '@/supabase/auth/route-handler';

function resolveSafeNextPath(next: string | null): string {
  if (
    next &&
    next.startsWith('/') &&
    !next.startsWith('//') &&
    isPasswordUpdateRoute(next)
  ) {
    return next;
  }

  return ROUTES.atualizarSenha;
}

/**
 * Troca o `code` do Supabase (PKCE / e-mail de recovery) por sessão em cookies.
 */
export async function GET(request: NextRequest) {
  const {searchParams, origin} = new URL(request.url);
  const code = searchParams.get('code');
  const nextPath = resolveSafeNextPath(searchParams.get('next'));

  if (code) {
    const redirectUrl = new URL(nextPath, origin);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    const {supabase, response} = createRouteHandlerClient(
      request,
      redirectResponse,
    );

    const {error} = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return response;
    }
  }

  return NextResponse.redirect(new URL(getRecoveryInvalidLoginUrl(), origin));
}
