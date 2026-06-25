import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';

import {supabaseConfig} from '@/supabase/utils/config';
import type {Database} from '@/supabase/types';

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers.
 * Preparado para leitura/escrita de sessão via cookies (auth futura).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    supabaseConfig.url,
    supabaseConfig.anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet, _headers) {
          try {
            cookiesToSet.forEach(({name, value, options}) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll chamado em Server Component — ignorado quando o
            // middleware/proxy cuida do refresh de sessão.
          }
        },
      },
    },
  );
}
