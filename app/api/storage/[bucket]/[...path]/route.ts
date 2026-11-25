import {type NextRequest, NextResponse} from 'next/server';

import {createPrivateFileResponse} from '@/lib/storage/private-file-response';
import {createClient} from '@/supabase/server';
import {isSupabaseAccessBlockedError} from '@/supabase/utils/errors';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  {params}: {params: Promise<{bucket: string; path: string[]}>},
) {
  const {bucket, path} = await params;

  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch (error) {
    // Extensões de imagem não passam pelo middleware: aqui a trava de produção
    // vira o mesmo 503, sem corpo. Qualquer outro erro segue como antes.
    if (isSupabaseAccessBlockedError(error) && error.reason === 'production_database_blocked') {
      return new NextResponse(null, {status: 503, headers: {'Cache-Control': 'no-store'}});
    }
    throw error;
  }

  return createPrivateFileResponse(supabase, bucket, path);
}
