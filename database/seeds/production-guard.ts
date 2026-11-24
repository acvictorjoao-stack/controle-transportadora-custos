import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {PRODUCTION_SUPABASE_PROJECT_REFS} from '../../supabase/utils/deployment-guard';

/**
 * Trava central de ambiente para as ferramentas que GRAVAM ou APAGAM dados
 * (seed/reset da demo, seed/recuperação/reset/exclusão definitiva de HML).
 *
 * A partir do piloto (2026-11), o projeto Supabase abaixo guarda dados REAIS
 * de clientes. Nenhuma dessas ferramentas pode gravar nele — nem com flags,
 * nem com variáveis de confirmação. Para voltar a usá-las, crie um projeto
 * separado de homologação e aponte as ferramentas para ele.
 *
 * Fail-closed: URL ausente, inválida, de host desconhecido ou projeto
 * vinculado à CLI que não pode ser confirmado também bloqueia.
 *
 * A checagem é local (texto da URL / arquivo de vínculo da CLI): roda antes de
 * criar qualquer cliente Supabase ou abrir qualquer conexão.
 *
 * Ferramentas só de leitura (scripts `*-readonly.ts`) não usam esta trava.
 *
 * A lista de projetos com dados reais é a mesma da trava do app
 * (supabase/utils/deployment-guard.ts) — uma única fonte.
 */
export const PRODUCTION_PROJECT_REFS: readonly string[] = PRODUCTION_SUPABASE_PROJECT_REFS;

/** Arquivo em que a CLI do Supabase grava o projeto vinculado (`supabase link`). */
export const SUPABASE_LINKED_PROJECT_REF_FILE = 'supabase/.temp/project-ref';

export class ProductionTargetBlockedError extends Error {
  readonly tool: string;

  constructor(tool: string, reason: string) {
    super(`Bloqueado (${tool}): ${reason}`);
    this.name = 'ProductionTargetBlockedError';
    this.tool = tool;
  }
}

/**
 * Extrai o project-ref do host `<ref>.supabase.co`.
 * Retorna null para URL vazia, inválida ou de outro host. Nunca ecoa a URL.
 */
export function projectRefFromSupabaseUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const host = new URL(trimmed).hostname.toLowerCase();
    const match = /^([a-z0-9]+)\.supabase\.co$/.exec(host);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function isProductionProjectRef(ref: string | null | undefined): boolean {
  if (!ref) return false;
  return PRODUCTION_PROJECT_REFS.includes(ref.trim().toLowerCase());
}

function productionReason(ref: string): string {
  return (
    `o projeto Supabase ${ref} guarda dados reais de clientes. ` +
    'Ferramentas de demo/homologação não gravam nem apagam nele. ' +
    'Use um projeto de homologação separado.'
  );
}

/**
 * Valida um project-ref já conhecido (ex.: constante da ferramenta).
 * Retorna o ref quando permitido.
 */
export function assertWritableProjectRef(ref: string | null | undefined, tool: string): string {
  const normalized = ref?.trim().toLowerCase() ?? '';
  if (!normalized) {
    throw new ProductionTargetBlockedError(tool, 'project-ref ausente; não é possível confirmar o destino.');
  }
  if (isProductionProjectRef(normalized)) {
    throw new ProductionTargetBlockedError(tool, productionReason(normalized));
  }
  return normalized;
}

/**
 * Valida a URL do Supabase que a ferramenta vai usar. Retorna o project-ref.
 * Chamar ANTES de exigir chaves e de criar o cliente.
 */
export function assertWritableSupabaseUrl(url: string | null | undefined, tool: string): string {
  const trimmed = url?.trim() ?? '';
  if (!trimmed) {
    throw new ProductionTargetBlockedError(
      tool,
      'NEXT_PUBLIC_SUPABASE_URL ausente; não é possível confirmar o destino.',
    );
  }
  const ref = projectRefFromSupabaseUrl(trimmed);
  if (!ref) {
    throw new ProductionTargetBlockedError(
      tool,
      'NEXT_PUBLIC_SUPABASE_URL inválida ou fora de *.supabase.co; não é possível confirmar o destino.',
    );
  }
  return assertWritableProjectRef(ref, tool);
}

/**
 * Valida o projeto vinculado à CLI (`supabase ... --linked`), lido de
 * `supabase/.temp/project-ref`. Sem o arquivo, bloqueia (fail-closed).
 */
export function assertWritableLinkedProject(tool: string, cwd: string = process.cwd()): string {
  const file = resolve(cwd, SUPABASE_LINKED_PROJECT_REF_FILE);
  if (!existsSync(file)) {
    throw new ProductionTargetBlockedError(
      tool,
      `${SUPABASE_LINKED_PROJECT_REF_FILE} ausente; não é possível confirmar o projeto vinculado à CLI.`,
    );
  }
  const ref = readFileSync(file, 'utf8').trim();
  return assertWritableProjectRef(ref, tool);
}
