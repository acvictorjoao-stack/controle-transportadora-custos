/**
 * Valida variáveis de ambiente do Supabase na inicialização do servidor.
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const {validateSupabaseEnv} = await import('@/supabase/utils/env');
    validateSupabaseEnv();
  }
}
