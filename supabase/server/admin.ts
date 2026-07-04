import {createClient} from '@supabase/supabase-js';

import type {Database} from '@/supabase/types';
import {getSupabaseEnv} from '@/supabase/utils/env';

/**
 * Cliente Supabase com service_role — exclusivo para Server Actions / Route Handlers.
 * Nunca importar em Client Components.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY não configurada. Necessária para provisionar administradores.',
    );
  }

  const {url} = getSupabaseEnv();

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
