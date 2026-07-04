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
  constructor(missingKeys: string[], emptyKeys: string[] = []) {
    const parts: string[] = [
      `Variáveis de ambiente do Supabase ausentes: ${missingKeys.join(', ')}.`,
    ];

    if (emptyKeys.length > 0) {
      parts.push(
        `As variáveis ${emptyKeys.join(', ')} estão definidas em process.env, mas vazias — ` +
          'isso impede que o Next.js carregue os valores de .env.local. ' +
          'Remova-as do ambiente do sistema/IDE ou preencha-as corretamente.',
      );
    } else {
      parts.push('Configure-as em .env.local antes de iniciar a aplicação.');
    }

    super(parts.join(' '));
    this.name = 'SupabaseEnvError';
  }
}

function readSupabaseEnv(): SupabaseEnv {
  // Acesso estático — necessário para o bundler inlinar NEXT_PUBLIC_* no client.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  const missing: string[] = [];
  const empty: string[] = [];

  if (!url) {
    missing.push(SUPABASE_ENV_KEYS.url);
    if (process.env.NEXT_PUBLIC_SUPABASE_URL !== undefined) {
      empty.push(SUPABASE_ENV_KEYS.url);
    }
  }

  if (!anonKey) {
    missing.push(SUPABASE_ENV_KEYS.anonKey);
    if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== undefined) {
      empty.push(SUPABASE_ENV_KEYS.anonKey);
    }
  }

  if (missing.length > 0) {
    throw new SupabaseEnvError(missing, empty);
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
 * Utilizado por instrumentation.ts.
 */
export function validateSupabaseEnv(): SupabaseEnv {
  cachedEnv = null;
  return getSupabaseEnv();
}

export {SUPABASE_ENV_KEYS};
