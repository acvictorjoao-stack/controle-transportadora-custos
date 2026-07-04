import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';

import {SUPABASE_ENV_KEYS} from './env';

const SUPABASE_ENV_KEY_LIST = Object.values(SUPABASE_ENV_KEYS);

function parseEnvContents(contents: string): Record<string, string> {
  const result: Record<string, string> = {};

  for (const line of contents.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

/**
 * Preenche variáveis ausentes/vazias a partir de .env.local / .env.
 *
 * O @next/env (via dotenv) não sobrescreve chaves já presentes em process.env,
 * mesmo quando estão vazias. Isso faz o .env.local ser ignorado silenciosamente.
 *
 * Executar apenas no runtime Node.js (instrumentation.ts).
 */
export function hydrateSupabaseEnvFromFiles(): void {
  const needsHydration = SUPABASE_ENV_KEY_LIST.some(
    (key) => !process.env[key]?.trim(),
  );

  if (!needsHydration) return;

  for (const fileName of ['.env.local', '.env']) {
    const filePath = join(process.cwd(), fileName);
    if (!existsSync(filePath)) continue;

    try {
      const parsed = parseEnvContents(readFileSync(filePath, 'utf8'));

      for (const key of SUPABASE_ENV_KEY_LIST) {
        if (!process.env[key]?.trim() && parsed[key]?.trim()) {
          process.env[key] = parsed[key].trim();
        }
      }
    } catch {
      // Falha de leitura será reportada em validateSupabaseEnv().
    }
  }
}
