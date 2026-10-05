import type {NextRequest} from 'next/server';

import {createPrivateFileResponse} from '@/lib/storage/private-file-response';
import {createClient} from '@/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  {params}: {params: Promise<{bucket: string; path: string[]}>},
) {
  const {bucket, path} = await params;
  const supabase = await createClient();
  return createPrivateFileResponse(supabase, bucket, path);
}
