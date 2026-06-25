import {getSupabaseEnv} from './env';

/**
 * Configuração centralizada do Supabase.
 * Todas as referências a URL, chaves e endpoints devem passar por aqui.
 */
export const supabaseConfig = {
  get url(): string {
    return getSupabaseEnv().url;
  },

  get anonKey(): string {
    return getSupabaseEnv().anonKey;
  },

  /** Endpoint público de saúde do Auth (GoTrue) — não acessa tabelas. */
  healthPath: '/auth/v1/health',
} as const;

export function getSupabaseHealthUrl(): string {
  const base = supabaseConfig.url.replace(/\/$/, '');
  return `${base}${supabaseConfig.healthPath}`;
}
