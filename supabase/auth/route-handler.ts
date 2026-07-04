import {createServerClient} from '@supabase/ssr';
import {type NextRequest, NextResponse} from 'next/server';

import {supabaseConfig} from '@/supabase/utils/config';
import type {Database} from '@/supabase/types';

/**
 * Cria cliente Supabase para Route Handlers (API routes).
 * Gerencia cookies na resposta HTTP.
 */
export function createRouteHandlerClient(
  request: NextRequest,
  response: NextResponse = NextResponse.next({request}),
) {
  return {
    supabase: createServerClient<Database>(
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

            cookiesToSet.forEach(({name, value, options}) => {
              response.cookies.set(name, value, options);
            });

            Object.entries(headers).forEach(([key, value]) => {
              response.headers.set(key, value);
            });
          },
        },
      },
    ),
    response,
  };
}

export async function getRouteHandlerUser(request: NextRequest) {
  const {supabase} = createRouteHandlerClient(request);
  const {data, error} = await supabase.auth.getUser();

  if (error) {
    return {user: null, error};
  }

  return {user: data.user, error: null};
}
