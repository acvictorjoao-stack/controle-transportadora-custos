import type {SupabaseClient} from '@supabase/supabase-js';
import {NextResponse} from 'next/server';

import {
  isPrivateStorageBucket,
  isValidStorageObjectPath,
  SIGNED_URL_TTL_SECONDS,
} from './private-files';

type StorageSessionClient = Pick<SupabaseClient, 'auth' | 'storage'>;

const NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Referrer-Policy': 'no-referrer',
};

function deny(status: 401 | 404): NextResponse {
  return new NextResponse(null, {status, headers: NO_STORE_HEADERS});
}

/**
 * Redireciona para uma URL assinada do objeto. A assinatura é pedida com a
 * sessão do usuário: sem SELECT liberado pela RLS (empresa da pasta + permissão
 * de leitura do módulo) o Storage recusa e a resposta é 404, sem distinguir
 * arquivo inexistente de arquivo de outra empresa.
 */
export async function createPrivateFileResponse(
  supabase: StorageSessionClient,
  bucket: string,
  pathSegments: string[],
): Promise<NextResponse> {
  const objectPath = pathSegments.join('/');
  if (!isPrivateStorageBucket(bucket) || !isValidStorageObjectPath(objectPath)) {
    return deny(404);
  }

  const {
    data: {user},
  } = await supabase.auth.getUser();
  if (!user) return deny(401);

  const {data, error} = await supabase.storage
    .from(bucket)
    .createSignedUrl(objectPath, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) return deny(404);

  const response = NextResponse.redirect(data.signedUrl, 302);
  for (const [name, value] of Object.entries(NO_STORE_HEADERS)) {
    response.headers.set(name, value);
  }
  return response;
}
