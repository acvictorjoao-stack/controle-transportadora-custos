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

    hydrateSupabaseEnvFromFiles();
    const env = validateSupabaseEnv();

    let host = 'invalid';
    try {
      host = new URL(env.url).host;
    } catch {
      host = 'invalid';
    }

    console.info('[AUTH_DEBUG]', {
      stage: 'instrumentation_boot',
      at: new Date().toISOString(),
      supabaseHost: host,
      anonKeyFormat: env.anonKey.startsWith('eyJ')
        ? 'legacy_jwt'
        : env.anonKey.startsWith('sb_publishable_')
          ? 'sb_publishable'
          : 'unknown',
      anonKeyLen: env.anonKey.length,
      serviceRolePresent: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
      serviceRoleFormat: (() => {
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? '';
        if (!key) return 'missing';
        if (key.startsWith('eyJ')) return 'legacy_jwt';
        if (key.startsWith('sb_secret_')) return 'sb_secret';
        return 'unknown';
      })(),
      serviceRoleLen: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()?.length ?? 0,
      serviceRoleDefined: process.env.SUPABASE_SERVICE_ROLE_KEY !== undefined,
    });
  }
}
