import {createServerClient} from '@supabase/ssr';
import {type NextRequest, NextResponse} from 'next/server';

import {supabaseConfig} from '@/supabase/utils/config';
import type {Database} from '@/supabase/types';

/**
 * Atualiza a sessão Supabase no middleware.
 *
 * Responsabilidades atuais (Sprint 4):
 * - Leitura de sessão via cookies
 * - Refresh automático de tokens (getClaims)
 *
 * Proteção de rotas será adicionada em sprint futura.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({request});

  const supabase = createServerClient<Database>(
    supabaseConfig.url,
    supabaseConfig.anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({name, value}) => {
            request.cookies.set(name, value);
          });

          supabaseResponse = NextResponse.next({request});

          cookiesToSet.forEach(({name, value, options}) => {
            supabaseResponse.cookies.set(name, value, options);
          });

          Object.entries(headers).forEach(([key, value]) => {
            supabaseResponse.headers.set(key, value);
          });
        },
      },
    },
  );

  // Refresh de sessão — necessário para manter cookies sincronizados.
  // Não implementa proteção de rotas nesta sprint.
  await supabase.auth.getClaims();

  return supabaseResponse;
}
