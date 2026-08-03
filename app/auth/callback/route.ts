import {type EmailOtpType} from '@supabase/supabase-js';
import {type NextRequest, NextResponse} from 'next/server';

import {ROUTES} from '@/constants/routes/paths';
import {logAuthError} from '@/lib/auth/auth-errors';
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
 * Troca code (PKCE) ou token_hash (OTP e-mail) por sessão em cookies SSR.
 */
export async function GET(request: NextRequest) {
  const {searchParams, origin} = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const typeParam = searchParams.get('type');
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

    logAuthError(error, 'auth.callback.exchangeCodeForSession');
  } else if (tokenHash && typeParam) {
    const redirectUrl = new URL(nextPath, origin);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    const {supabase, response} = createRouteHandlerClient(
      request,
      redirectResponse,
    );

    const {error} = await supabase.auth.verifyOtp({
      type: typeParam as EmailOtpType,
      token_hash: tokenHash,
    });

    if (!error) {
      return response;
    }

    logAuthError(error, 'auth.callback.verifyOtp');
  }

  return NextResponse.redirect(new URL(getRecoveryInvalidLoginUrl(), origin));
}
