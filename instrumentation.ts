/**
 * Valida variáveis de ambiente do Supabase na inicialização do servidor.
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const {hydrateSupabaseEnvFromFiles} = await import(
      '@/supabase/utils/env-hydrate'
    );
    const {validateSupabaseEnv} = await import('@/supabase/utils/env');
    const {SupabaseAccessBlockedError} = await import(
      '@/supabase/utils/deployment-guard'
    );

    hydrateSupabaseEnvFromFiles();
    try {
      validateSupabaseEnv();
    } catch (error) {
      // Trava de ambiente (ex.: Preview apontando para produção): registra uma
      // linha sem URL nem chaves e segue — cada acesso ao banco continua
      // bloqueado no middleware e em getSupabaseEnv().
      if (error instanceof SupabaseAccessBlockedError) {
        console.error(`[fleetcontrol] ${error.message}`);
        return;
      }
      throw error;
    }
  }
}
