import {NextResponse} from 'next/server';

import {
  formatSupabaseError,
  getSupabaseHealthUrl,
  isSupabaseEnvError,
  supabaseConfig,
} from '@/supabase/utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type HealthStatus = 'conectado' | 'indisponível';

/**
 * Health check do Supabase.
 * Verifica conectividade via endpoint público do Auth — sem acessar tabelas.
 */
export async function GET() {
  try {
    const status = await checkSupabaseConnection();
    const httpStatus = status === 'conectado' ? 200 : 503;

    return NextResponse.json({status}, {status: httpStatus});
  } catch (error) {
    const message = formatSupabaseError(error);
    const httpStatus = isSupabaseEnvError(error) ? 500 : 503;

    return NextResponse.json(
      {status: 'indisponível' as const, message},
      {status: httpStatus},
    );
  }
}

async function checkSupabaseConnection(): Promise<HealthStatus> {
  const response = await fetch(getSupabaseHealthUrl(), {
    method: 'GET',
    headers: {
      apikey: supabaseConfig.anonKey,
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  });

  return response.ok ? 'conectado' : 'indisponível';
}
