import {createBrowserClient} from '@supabase/ssr';
import type {SupabaseClient} from '@supabase/supabase-js';

import {supabaseConfig} from '@/supabase/utils/config';
import type {Database} from '@/supabase/types';

let browserClient: SupabaseClient<Database> | undefined;

/**
 * Cliente Supabase para Client Components (browser).
 * Singleton evita múltiplos listeners de auth e estado inconsistente.
 */
export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      supabaseConfig.url,
      supabaseConfig.anonKey,
    );
  }

  return browserClient;
}

/** Reseta o singleton após logout para descartar cache de sessão stale. */
export function resetBrowserClient() {
  browserClient = undefined;
}
