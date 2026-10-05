import {z} from 'zod';

import {STORAGE_BUCKETS, type StorageBucketName} from './buckets';

/**
 * Arquivos de Storage são privados (097). O banco guarda só o path do objeto
 * ({company_id}/...); a interface recebe a rota /api/storage/{bucket}/{path},
 * que exige sessão e redireciona para uma URL assinada de curta duração gerada
 * com o cliente do usuário (RLS de storage.objects decide o acesso).
 */

export const STORAGE_FILE_ROUTE = '/api/storage';

/** Validade da URL assinada: só precisa durar o redirect da rota. */
export const SIGNED_URL_TTL_SECONDS = 60;

export const STORAGE_PATH_OUTSIDE_COMPANY = 'Arquivo não pertence à empresa atual.';

export const PRIVATE_STORAGE_BUCKETS: readonly StorageBucketName[] =
  Object.values(STORAGE_BUCKETS);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Prefixos de URLs do Storage gravadas antes de 097 (ou geradas pelo SDK). */
const SUPABASE_OBJECT_PREFIXES = ['public', 'sign', 'authenticated'].map(
  (kind) => `/storage/v1/object/${kind}/`,
);

export function isPrivateStorageBucket(value: string): value is StorageBucketName {
  return (PRIVATE_STORAGE_BUCKETS as readonly string[]).includes(value);
}

/** Mesmo formato exigido pelas policies: primeiro segmento é o company_id. */
export function isValidStorageObjectPath(path: string): boolean {
  const segments = path.split('/');
  if (segments.length < 2 || !UUID_PATTERN.test(segments[0])) return false;
  return segments.every(
    (segment) =>
      segment.length > 0 &&
      segment !== '.' &&
      segment !== '..' &&
      !/[\\?#\u0000-\u001f]/.test(segment),
  );
}

export function isCompanyStoragePath(companyId: string, path: string): boolean {
  return isValidStorageObjectPath(path) && path.split('/')[0] === companyId.toLowerCase();
}

function decodeSegments(path: string): string | null {
  try {
    return path.split('/').map(decodeURIComponent).join('/');
  } catch {
    return null;
  }
}

function stripQuery(value: string): string {
  return value.split(/[?#]/)[0];
}

/**
 * Path do objeto a partir do valor gravado: path puro, rota da aplicação ou
 * URL do Storage (registros antigos guardam a URL pública com `?t=`).
 */
export function extractStorageObjectPath(
  bucket: StorageBucketName,
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  let candidate: string | null = null;

  if (/^https?:\/\//i.test(trimmed)) {
    let pathname: string;
    try {
      pathname = new URL(trimmed).pathname;
    } catch {
      return null;
    }
    for (const prefix of SUPABASE_OBJECT_PREFIXES) {
      if (pathname.startsWith(`${prefix}${bucket}/`)) {
        candidate = decodeSegments(pathname.slice(prefix.length + bucket.length + 1));
        break;
      }
    }
  } else if (trimmed.startsWith('/')) {
    const routePrefix = `${STORAGE_FILE_ROUTE}/${bucket}/`;
    const pathname = stripQuery(trimmed);
    if (pathname.startsWith(routePrefix)) {
      candidate = decodeSegments(pathname.slice(routePrefix.length));
    }
  } else {
    candidate = stripQuery(trimmed);
  }

  return candidate && isValidStorageObjectPath(candidate) ? candidate : null;
}

/**
 * URL de exibição/download para a interface. `version` força o navegador a
 * buscar de novo quando o arquivo é substituído no mesmo path.
 */
export function buildStorageFileUrl(
  bucket: StorageBucketName,
  value: string | null | undefined,
  version?: string | null,
): string | null {
  const path = extractStorageObjectPath(bucket, value);
  if (!path) return null;

  const url = `${STORAGE_FILE_ROUTE}/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}`;
  return version ? `${url}?v=${encodeURIComponent(version)}` : url;
}

export const storageObjectPathSchema = z
  .string()
  .trim()
  .refine(isValidStorageObjectPath, 'Caminho de arquivo inválido.');

/** Aceita path, rota da aplicação ou URL legada do bucket e devolve o path. */
export function storageReferenceSchema(bucket: StorageBucketName) {
  return z.string().trim().transform((value, ctx) => {
    const path = extractStorageObjectPath(bucket, value);
    if (!path) {
      ctx.addIssue({code: 'custom', message: 'Arquivo inválido.'});
      return z.NEVER;
    }
    return path;
  });
}
