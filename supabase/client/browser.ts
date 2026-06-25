import {createBrowserClient} from '@supabase/ssr';

import {supabaseConfig} from '@/supabase/utils/config';
import type {Database} from '@/supabase/types';

/**
 * Cliente Supabase para Client Components (browser).
 * Utiliza singleton interno do @supabase/ssr.
 */
export function createClient() {
  return createBrowserClient<Database>(
    supabaseConfig.url,
    supabaseConfig.anonKey,
  );
}
