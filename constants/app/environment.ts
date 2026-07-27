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
 * Preferência: NEXT_PUBLIC_APP_ENV → NODE_ENV.
 */
export function resolveAppEnvironmentLabel(
  env: NodeJS.ProcessEnv = process.env,
): AppEnvironmentLabel {
  const explicit = env.NEXT_PUBLIC_APP_ENV?.trim().toLowerCase();
  if (explicit === 'production' || explicit === 'prod') return 'Produção';
  if (
    explicit === 'test' ||
    explicit === 'testing' ||
    explicit === 'development' ||
    explicit === 'dev' ||
    explicit === 'staging'
  ) {
    return 'Teste';
  }
  return env.NODE_ENV === 'production' ? 'Produção' : 'Teste';
}
