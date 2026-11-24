import {createClient} from '@supabase/supabase-js';

import type {Database} from '@/supabase/types';

import {assertWritableSupabaseUrl} from '../production-guard';
import {loadLocalEnv} from './env';

export const DEMO_SEED_TOOL = 'seed/reset da demo';

export function createDemoSeedClient() {
  loadLocalEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  // Trava de ambiente antes de exigir a service role e de criar o cliente:
  // a demo nunca grava nem apaga no projeto de produção (dados reais).
  assertWritableSupabaseUrl(url, DEMO_SEED_TOOL);

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local para executar a seed demo.',
    );
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
