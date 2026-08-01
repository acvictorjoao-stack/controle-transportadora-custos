import {createClient} from '@supabase/supabase-js';

import type {Database} from '@/supabase/types';
import {getSupabaseEnv} from '@/supabase/utils/env';

/**
 * Cliente Supabase com service_role — exclusivo para Server Actions / Route Handlers.
 * Nunca importar em Client Components.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const serviceRoleRaw = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // TEMP — diagnóstico admin client. Remover após identificar a causa. Não loga a chave.
  console.info('[RESET_PASSWORD_DEBUG]', {
    stage: 'createAdminClient_env',
    at: new Date().toISOString(),
    serviceRoleDefined: serviceRoleRaw !== undefined,
    serviceRolePresent: Boolean(serviceRoleKey),
    serviceRoleLen: serviceRoleKey?.length ?? 0,
    serviceRoleFormat: !serviceRoleKey
      ? 'missing'
      : serviceRoleKey.startsWith('eyJ')
        ? 'legacy_jwt'
        : serviceRoleKey.startsWith('sb_secret_')
          ? 'sb_secret'
          : 'unknown',
  });

  if (!serviceRoleKey) {
    const isDefinedButEmpty =
      process.env.SUPABASE_SERVICE_ROLE_KEY !== undefined;

    const message = isDefinedButEmpty
      ? 'SUPABASE_SERVICE_ROLE_KEY está definida, mas vazia. Remova-a do ambiente do sistema/IDE ou preencha-a corretamente em .env.local.'
      : 'SUPABASE_SERVICE_ROLE_KEY não configurada. Necessária para provisionar administradores — configure-a em .env.local.';

    console.error('[RESET_PASSWORD_DEBUG]', {
      stage: 'createAdminClient_missing_key',
      errorMessage: message,
      serviceRoleDefined: isDefinedButEmpty,
    });

    throw new Error(message);
  }

  const {url} = getSupabaseEnv();

  console.info('[RESET_PASSWORD_DEBUG]', {
    stage: 'createAdminClient_ready',
    supabaseHost: (() => {
      try {
        return new URL(url).host;
      } catch {
        return 'invalid';
      }
    })(),
  });

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
