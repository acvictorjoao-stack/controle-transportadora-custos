import {createClient} from '@supabase/supabase-js';

import type {Database} from '@/supabase/types';
import {getSupabaseEnv} from '@/supabase/utils/env';

/**
 * Cliente Supabase com service_role — exclusivo para Server Actions / Route Handlers.
 * Nunca importar em Client Components.
 */
export function createAdminClient() {
  // Primeiro a trava de ambiente (dentro de getSupabaseEnv): um Preview não
  // chega nem a ler a service role se o banco configurado for o de produção.
  const {url} = getSupabaseEnv();

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!serviceRoleKey) {
    const isDefinedButEmpty =
      process.env.SUPABASE_SERVICE_ROLE_KEY !== undefined;

    throw new Error(
      isDefinedButEmpty
        ? 'SUPABASE_SERVICE_ROLE_KEY está definida, mas vazia. Remova-a do ambiente do sistema/IDE ou preencha-a corretamente em .env.local.'
        : 'SUPABASE_SERVICE_ROLE_KEY não configurada. Necessária para provisionar administradores — configure-a em .env.local.',
    );
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
