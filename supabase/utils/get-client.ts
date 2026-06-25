/**
 * Ponto de entrada para obtenção do cliente Supabase correto por contexto de execução.
 *
 * - Browser (Client Components): getBrowserSupabaseClient
 * - Server (RSC, Actions, Route Handlers): getServerSupabaseClient
 * - Middleware: updateSession (em supabase/middleware)
 */

export {createClient as getBrowserSupabaseClient} from '@/supabase/client/browser';
export {createClient as getServerSupabaseClient} from '@/supabase/server/server';
