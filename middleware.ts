import {type NextRequest} from 'next/server';

import {updateSession} from '@/supabase/middleware';
import {createMiddlewareRequestId} from '@/supabase/middleware/timing';

export async function middleware(request: NextRequest) {
  return updateSession(request, createMiddlewareRequestId());
}

export const config = {
  matcher: [
    /*
     * Executa em todas as rotas exceto assets estáticos.
     * Preparado para proteção de rotas e refresh de sessão futuros.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
