import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';

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

export interface HmlAuthEnv {
  url: string;
  anonKey: string;
  adminEmail: string;
  adminPassword: string;
}

/**
 * Credenciais do administrador da empresa — nunca service_role.
 * Senha e chaves não devem ser impressas.
 */
export function requireHmlAuthEnv(): HmlAuthEnv {
  loadLocalEnv();

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

  return {url, anonKey, adminEmail, adminPassword};
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
