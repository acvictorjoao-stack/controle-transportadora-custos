/**
 * Trava de ambiente do app: deployments de Preview — e qualquer ambiente que
 * não se identifique com segurança — não acessam o Supabase de produção.
 *
 * Regras (decideSupabaseAccess):
 * - Produção (Vercel, VERCEL_ENV=production) e desenvolvimento local
 *   (`next dev`, testes): sem mudança.
 * - Preview, Development da Vercel e ambiente não identificado: só aceitam uma
 *   URL `*.supabase.co` válida que NÃO seja o projeto de produção. URL ausente,
 *   inválida ou de produção bloqueia (fail-closed).
 *
 * O ambiente é gravado no build pelo next.config (`FLEETCONTROL_DEPLOYMENT_ENV`)
 * e chega igual ao servidor, ao middleware e ao navegador. No servidor, o
 * `VERCEL_ENV` de runtime também é conferido (defesa em profundidade).
 *
 * Módulo puro (sem Next.js): usado pelo next.config, pelo app e pelos scripts.
 * Mensagens nunca contêm URL, project-ref ou chaves.
 */

/** Projetos Supabase com dados reais de clientes (piloto, 2026-11). */
export const PRODUCTION_SUPABASE_PROJECT_REFS: readonly string[] = Object.freeze([
  'aobfjjaucdrwybebosxm',
]);

export type DeploymentEnvironment = 'production' | 'preview' | 'development' | 'local' | 'unknown';

export type SupabaseAccessContext =
  | 'production'
  | 'local-development'
  | 'preview'
  | 'vercel-development'
  | 'unidentified';

export type SupabaseAccessBlockReason =
  | 'production_database_blocked'
  | 'missing_url'
  | 'invalid_url';

export type SupabaseAccessDecision =
  | {allowed: true; context: SupabaseAccessContext}
  | {allowed: false; context: SupabaseAccessContext; reason: SupabaseAccessBlockReason};

const CONTEXT_LABELS: Record<SupabaseAccessContext, string> = {
  production: 'produção',
  'local-development': 'desenvolvimento local',
  preview: 'Preview',
  'vercel-development': 'Development da Vercel',
  unidentified: 'ambiente não identificado',
};

const REASON_MESSAGES: Record<SupabaseAccessBlockReason, string> = {
  production_database_blocked:
    'o Supabase configurado é o banco de produção, com dados reais de clientes',
  missing_url: 'a URL do Supabase não está configurada',
  invalid_url: 'a URL do Supabase é inválida ou não é de um projeto *.supabase.co',
};

export class SupabaseAccessBlockedError extends Error {
  readonly context: SupabaseAccessContext;
  readonly reason: SupabaseAccessBlockReason;

  constructor(context: SupabaseAccessContext, reason: SupabaseAccessBlockReason) {
    super(describeSupabaseAccessBlock(context, reason));
    this.name = 'SupabaseAccessBlockedError';
    this.context = context;
    this.reason = reason;
  }
}

export function describeSupabaseAccessBlock(
  context: SupabaseAccessContext,
  reason: SupabaseAccessBlockReason,
): string {
  return (
    `Acesso ao banco bloqueado neste deployment (${CONTEXT_LABELS[context]}): ` +
    `${REASON_MESSAGES[reason]}. ` +
    'Previews não acessam a produção; use a URL de produção ou configure um projeto Supabase de homologação para os Previews.'
  );
}

/** Extrai o project-ref de `https://<ref>.supabase.co`. Null para qualquer outra coisa. */
export function projectRefFromSupabaseUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim() ?? '';
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return null;
    const match = /^([a-z0-9]+)\.supabase\.co$/.exec(parsed.hostname.toLowerCase());
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function isProductionSupabaseRef(ref: string | null | undefined): boolean {
  if (!ref) return false;
  return PRODUCTION_SUPABASE_PROJECT_REFS.includes(ref.trim().toLowerCase());
}

/**
 * Ambiente do deployment a partir das variáveis de sistema da Vercel.
 * Fora da Vercel: 'local'. Na Vercel sem VERCEL_ENV reconhecível: 'unknown'.
 * Usado no build (next.config) para gravar FLEETCONTROL_DEPLOYMENT_ENV.
 */
export function resolveDeploymentEnvironment(
  env: Readonly<Record<string, string | undefined>>,
): DeploymentEnvironment {
  const onVercel = Boolean(env.VERCEL?.trim() || env.VERCEL_ENV?.trim() || env.VERCEL_URL?.trim());
  if (!onVercel) return 'local';
  const value = env.VERCEL_ENV?.trim().toLowerCase();
  if (value === 'production' || value === 'preview' || value === 'development') return value;
  return 'unknown';
}

function normalizeDeploymentEnvironment(value: string | undefined): DeploymentEnvironment | null {
  const v = value?.trim().toLowerCase();
  if (v === 'production' || v === 'preview' || v === 'development' || v === 'local' || v === 'unknown') {
    return v;
  }
  return null;
}

/**
 * Contexto de acesso. `nodeEnv === 'production'` fora da Vercel (ou com o
 * ambiente do build ausente/inválido) não é considerado desenvolvimento local:
 * vira 'unidentified' e não acessa a produção.
 */
export function resolveSupabaseAccessContext(input: {
  builtEnvironment: string | undefined;
  runtimeVercelEnv: string | undefined;
  nodeEnv: string | undefined;
}): SupabaseAccessContext {
  const built = normalizeDeploymentEnvironment(input.builtEnvironment);
  const runtime = input.runtimeVercelEnv?.trim().toLowerCase();

  // Runtime de servidor dizendo Preview/Development prevalece sobre o build.
  if (runtime === 'preview') return 'preview';
  if (runtime === 'development' && built !== 'local') return 'vercel-development';

  switch (built) {
    case 'production':
      // Build de produção, mas o servidor diz outra coisa reconhecível: não confia.
      if (runtime && runtime !== 'production') return 'unidentified';
      return 'production';
    case 'preview':
      return 'preview';
    case 'development':
      return 'vercel-development';
    case 'local':
    case null:
      if (built === null && runtime) return 'unidentified';
      return input.nodeEnv === 'production' ? 'unidentified' : 'local-development';
    default:
      return 'unidentified';
  }
}

export function decideSupabaseAccess(input: {
  url: string | null | undefined;
  context: SupabaseAccessContext;
}): SupabaseAccessDecision {
  const {context} = input;
  if (context === 'production' || context === 'local-development') {
    return {allowed: true, context};
  }
  if (!input.url?.trim()) return {allowed: false, context, reason: 'missing_url'};
  const ref = projectRefFromSupabaseUrl(input.url);
  if (!ref) return {allowed: false, context, reason: 'invalid_url'};
  if (isProductionSupabaseRef(ref)) {
    return {allowed: false, context, reason: 'production_database_blocked'};
  }
  return {allowed: true, context};
}

/** Contexto atual (servidor, middleware ou navegador). */
export function currentSupabaseAccessContext(): SupabaseAccessContext {
  return resolveSupabaseAccessContext({
    // Acesso estático: o Next.js substitui pelo valor gravado no build (next.config `env`).
    builtEnvironment: process.env.FLEETCONTROL_DEPLOYMENT_ENV,
    // Só existe no servidor; no navegador fica undefined.
    runtimeVercelEnv: typeof window === 'undefined' ? process.env.VERCEL_ENV : undefined,
    nodeEnv: process.env.NODE_ENV,
  });
}

/** Decisão para a URL informada no ambiente atual. */
export function currentSupabaseAccessDecision(url: string | null | undefined): SupabaseAccessDecision {
  return decideSupabaseAccess({url, context: currentSupabaseAccessContext()});
}

/** Lança SupabaseAccessBlockedError se o ambiente atual não pode usar a URL. */
export function assertSupabaseAccessAllowed(url: string | null | undefined): void {
  const decision = currentSupabaseAccessDecision(url);
  if (!decision.allowed) {
    throw new SupabaseAccessBlockedError(decision.context, decision.reason);
  }
}
