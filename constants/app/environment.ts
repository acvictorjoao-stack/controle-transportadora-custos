import {
  SIDEBAR_ACCORDION_DURATION_MS,
  SIDEBAR_ACCORDION_STORAGE_KEY,
  SIDEBAR_MOBILE_STORAGE_KEY,
  SIDEBAR_STORAGE_KEY,
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_EXPANDED,
} from './sidebar';

export {
  SIDEBAR_ACCORDION_DURATION_MS,
  SIDEBAR_ACCORDION_STORAGE_KEY,
  SIDEBAR_MOBILE_STORAGE_KEY,
  SIDEBAR_STORAGE_KEY,
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_EXPANDED,
};

/** Ambiente exibido no seletor de Workspace do rodapé. */
export type AppEnvironmentLabel = 'Produção' | 'Teste';

/**
 * Resolve o rótulo de ambiente sem alterar RBAC/rotas.
 * Preferência: NEXT_PUBLIC_APP_ENV → NEXT_PUBLIC_VERCEL_ENV → NODE_ENV.
 *
 * O padrão precisa ler cada variável de forma literal: o Next.js só as embute
 * no navegador assim. Passar `process.env` inteiro gera divergência de hidratação.
 */
export function resolveAppEnvironmentLabel(
  env: Partial<NodeJS.ProcessEnv> = {
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV,
    NODE_ENV: process.env.NODE_ENV,
  },
): AppEnvironmentLabel {
  const explicit = (env.NEXT_PUBLIC_APP_ENV || env.NEXT_PUBLIC_VERCEL_ENV)
    ?.trim()
    .toLowerCase();
  if (explicit === 'production' || explicit === 'prod') return 'Produção';
  if (
    explicit === 'test' ||
    explicit === 'testing' ||
    explicit === 'development' ||
    explicit === 'dev' ||
    explicit === 'staging' ||
    explicit === 'preview'
  ) {
    return 'Teste';
  }
  return env.NODE_ENV === 'production' ? 'Produção' : 'Teste';
}
