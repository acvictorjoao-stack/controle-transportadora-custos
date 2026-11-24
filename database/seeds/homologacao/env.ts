import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {assertWritableSupabaseUrl, projectRefFromSupabaseUrl} from '../production-guard';
import {HML_AUTHORIZED_PROJECT_REF} from './constants';

/** Carrega variáveis de .env.local para o script CLI (sem dependência extra). */
export function loadLocalEnv(): void {
  const envPath = resolve(process.cwd(), '.env.local');
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, 'utf8');
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separator = line.indexOf('=');
    if (separator <= 0) continue;

    const key = line.slice(0, separator).trim();
    // HML nunca hidrata service_role a partir do arquivo: a presença no
    // processo (IDE/shell) ainda bloqueia requireHmlAuthEnv (fail-closed).
    if (key === 'SUPABASE_SERVICE_ROLE_KEY') continue;

    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

/**
 * Extrai o project-ref do host `*.supabase.co` (implementação única na trava
 * central). Retorna null para URL inválida, host inesperado ou ref ausente.
 */
export {projectRefFromSupabaseUrl};

/** Nome da ferramenta nas mensagens da trava de produção. */
export const HML_WRITE_TOOL = 'ferramentas de homologação que gravam ou apagam';

/**
 * Trava de produção para as ferramentas de HML que gravam ou apagam: roda
 * antes de exigir credenciais e de criar qualquer cliente. Enquanto a
 * homologação estiver no mesmo projeto que recebe dados reais, sempre bloqueia.
 */
export function assertHmlWriteTargetFromEnv(): string {
  loadLocalEnv();
  return assertWritableSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL, HML_WRITE_TOOL);
}

/**
 * Fail-closed: só aceita exatamente `HML_AUTHORIZED_PROJECT_REF`.
 * Mensagens sem URL completa, keys ou senhas.
 */
export function assertHmlAuthorizedProjectRef(url: string): string {
  const projectRef = projectRefFromSupabaseUrl(url);
  if (!projectRef) {
    throw new Error(
      'Abortado: NEXT_PUBLIC_SUPABASE_URL inválida ou host não reconhecido como projeto Supabase autorizado para homologação.',
    );
  }
  if (projectRef !== HML_AUTHORIZED_PROJECT_REF) {
    throw new Error(
      `Abortado: project-ref do Supabase diverge do autorizado para homologação (esperado=${HML_AUTHORIZED_PROJECT_REF}).`,
    );
  }
  return projectRef;
}

/** Revalida o project-ref a partir do ambiente (defesa em profundidade nos guards). */
export function assertHmlProjectRefFromEnv(): string {
  loadLocalEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) {
    throw new Error(
      'Abortado: NEXT_PUBLIC_SUPABASE_URL ausente; project-ref de homologação não pode ser validado.',
    );
  }
  // Usada pelos guards destrutivos: além de ser o ref de HML, não pode ser produção.
  assertWritableSupabaseUrl(url, HML_WRITE_TOOL);
  return assertHmlAuthorizedProjectRef(url);
}

export type HmlEnvUrlProjectRefInspection =
  | {status: 'absent'; projectRefFromUrl: null}
  | {status: 'match'; projectRefFromUrl: string}
  | {status: 'mismatch'; projectRefFromUrl: string | null};

/**
 * Inspeção fail-closed do project-ref a partir de NEXT_PUBLIC_SUPABASE_URL
 * para CLIs locais (prepare-*). URL ausente → plano local offline permitido.
 * URL presente com host inválido ou ref divergente → mismatch (abort no CLI).
 * Nunca ecoa a URL completa.
 */
export function inspectHmlEnvUrlProjectRef(
  expectedRef: string = HML_AUTHORIZED_PROJECT_REF,
): HmlEnvUrlProjectRefInspection {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
  if (!url) {
    return {status: 'absent', projectRefFromUrl: null};
  }
  const projectRefFromUrl = projectRefFromSupabaseUrl(url);
  if (projectRefFromUrl === expectedRef) {
    return {status: 'match', projectRefFromUrl};
  }
  return {status: 'mismatch', projectRefFromUrl};
}

export interface HmlAuthEnv {
  url: string;
  anonKey: string;
  adminEmail: string;
  adminPassword: string;
  /** Project-ref já validado contra `HML_AUTHORIZED_PROJECT_REF`. */
  projectRef: string;
}

/**
 * Credenciais do administrador da empresa — nunca service_role.
 * Senha e chaves não devem ser impressas.
 * Exige project-ref exato antes de qualquer cliente/auth.
 */
export function requireHmlAuthEnv(): HmlAuthEnv {
  loadLocalEnv();

  // Trava de produção primeiro: nem chega a ler credenciais se o destino
  // for o projeto com dados reais.
  assertHmlWriteTargetFromEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const adminEmail = process.env.HML_ADMIN_EMAIL?.trim();
  const adminPassword = process.env.HML_ADMIN_PASSWORD?.trim();

  if (!url || !anonKey) {
    throw new Error(
      'Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY em .env.local.',
    );
  }

  if (!adminEmail || !adminPassword) {
    throw new Error(
      'Configure HML_ADMIN_EMAIL e HML_ADMIN_PASSWORD (administrador de primeira-empresa).',
    );
  }

  // Fail-closed: presença de service_role no ambiente indica risco de bypass.
  // Não imprimir nem retornar o valor — só abortar.
  if (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    throw new Error(
      'HML recusa ambiente com SUPABASE_SERVICE_ROLE_KEY definida. Remova a variável e use apenas anon key + admin da empresa.',
    );
  }

  // Fail-closed de projeto: antes de devolver credenciais / criar cliente.
  const projectRef = assertHmlAuthorizedProjectRef(url);

  return {url, anonKey, adminEmail, adminPassword, projectRef};
}

export function hasHmlAuthEnv(): boolean {
  loadLocalEnv();
  // Mesmo critério fail-closed: ambiente com service_role não é “pronto” para HML.
  if (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) return false;
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() &&
      process.env.HML_ADMIN_EMAIL?.trim() &&
      process.env.HML_ADMIN_PASSWORD?.trim(),
  );
}
