/**
 * Validação centralizada das variáveis de ambiente do Supabase.
 * A aplicação não deve iniciar sem essas variáveis configuradas.
 */

const SUPABASE_ENV_KEYS = {
  url: 'NEXT_PUBLIC_SUPABASE_URL',
  anonKey: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
} as const;

export type SupabaseEnv = {
  url: string;
  anonKey: string;
};

export class SupabaseEnvError extends Error {
  constructor(missingKeys: string[]) {
    super(
      `Variáveis de ambiente do Supabase ausentes: ${missingKeys.join(', ')}. ` +
        'Configure-as em .env.local antes de iniciar a aplicação.',
    );
    this.name = 'SupabaseEnvError';
  }
}

function readSupabaseEnv(): SupabaseEnv {
  const url = process.env[SUPABASE_ENV_KEYS.url]?.trim();
  const anonKey = process.env[SUPABASE_ENV_KEYS.anonKey]?.trim();

  const missing: string[] = [];

  if (!url) missing.push(SUPABASE_ENV_KEYS.url);
  if (!anonKey) missing.push(SUPABASE_ENV_KEYS.anonKey);

  if (missing.length > 0) {
    throw new SupabaseEnvError(missing);
  }

  return {url: url!, anonKey: anonKey!};
}

let cachedEnv: SupabaseEnv | null = null;

/**
 * Retorna as variáveis validadas do Supabase.
 * Lança SupabaseEnvError se alguma estiver ausente.
 */
export function getSupabaseEnv(): SupabaseEnv {
  if (!cachedEnv) {
    cachedEnv = readSupabaseEnv();
  }
  return cachedEnv;
}

/**
 * Valida as variáveis de ambiente na inicialização da aplicação.
 * Utilizado por instrumentation.ts e next.config.ts.
 */
export function validateSupabaseEnv(): SupabaseEnv {
  cachedEnv = null;
  return getSupabaseEnv();
}
