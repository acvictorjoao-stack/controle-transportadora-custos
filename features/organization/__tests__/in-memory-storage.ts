import {createHmac} from 'node:crypto';
import {readdirSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {
  isActiveMember,
  memberHasPermission,
  type InMemoryDatabase,
} from './in-memory-supabase';

/**
 * Emulador do Supabase Storage para testes. Visibilidade dos buckets e policies
 * de storage.objects são lidas do estado final das migrations — o emulador não
 * define regra própria. Não substitui a validação no Supabase real.
 */

type Operation = 'select' | 'insert' | 'update' | 'delete';

type PolicyRule =
  | {kind: 'permission'; code: string}
  | {kind: 'member'}
  | {kind: 'open'};

export interface StoragePolicy {
  name: string;
  bucket: string;
  operation: Operation;
  role: string;
  rule: PolicyRule;
}

const migrationsDir = resolve(process.cwd(), 'supabase/migrations');

export const migrationFiles = readdirSync(migrationsDir)
  .filter((file) => file.endsWith('.sql'))
  .sort();

export function readMigration(file: string): string {
  return readFileSync(resolve(migrationsDir, file), 'utf8').replace(/\r\n/g, '\n');
}

const allMigrations = migrationFiles.map(readMigration).join('\n');

export function readFinalStoragePolicies(): StoragePolicy[] {
  const names = new Set(
    [...allMigrations.matchAll(/create policy (\w+)\n\s+on storage\.objects/g)].map(
      (match) => match[1],
    ),
  );

  const policies: StoragePolicy[] = [];
  for (const name of names) {
    const created = allMigrations.lastIndexOf(`create policy ${name}\n`);
    const dropped = allMigrations.lastIndexOf(`drop policy if exists ${name} `);
    if (dropped > created) continue;

    const body = allMigrations.slice(created, allMigrations.indexOf(';', created));
    const operation = body.match(/\n\s+for (select|insert|update|delete)\n/)?.[1] as Operation;
    const role = body.match(/\n\s+to (\w+)\n/)?.[1] ?? 'public';
    const bucket = body.match(/bucket_id = '([\w-]+)'/)?.[1] ?? '';
    const code = body.match(/'([a-z_]+:[a-z_]+)'/)?.[1];
    const rule: PolicyRule = code
      ? {kind: 'permission', code}
      : body.includes('public.is_company_member(')
        ? {kind: 'member'}
        : {kind: 'open'};

    policies.push({name, bucket, operation, role, rule});
  }
  return policies;
}

export function readFinalBucketVisibility(): Record<string, boolean> {
  const state: Record<string, boolean> = {};
  for (const file of migrationFiles) {
    const sql = readMigration(file);
    for (const match of sql.matchAll(
      /insert into storage\.buckets[\s\S]*?values\s*\(\s*'([\w-]+)',\s*'[\w-]+',\s*(true|false)/g,
    )) {
      state[match[1]] = match[2] === 'true';
    }
    for (const match of sql.matchAll(
      /update storage\.buckets\s+set public = (true|false)\s+where id in \(([^)]*)\)/g,
    )) {
      for (const id of match[2].matchAll(/'([\w-]+)'/g)) {
        state[id[1]] = match[1] === 'true';
      }
    }
  }
  return state;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** public.storage_object_company_id: primeiro segmento, só se for UUID. */
function objectCompanyId(path: string): string | null {
  const first = path.split('/')[0];
  return UUID.test(first) ? first : null;
}

const RLS_ERROR = {message: 'new row violates row-level security policy', statusCode: '403'};
const NOT_FOUND = {message: 'Object not found', statusCode: '404'};
const SIGNED_HOST = 'https://emulator.supabase.co';
const SIGNING_SECRET = 'emulator-jwt-secret';

function sign(payload: string): string {
  return createHmac('sha256', SIGNING_SECRET).update(payload).digest('base64url');
}

export class InMemoryStorage {
  readonly objects = new Map<string, string>();
  readonly buckets = readFinalBucketVisibility();
  readonly policies = readFinalStoragePolicies();
  /** Relógio do Storage (ms), ajustável para simular expiração. */
  now = Date.now();

  constructor(private readonly db: InMemoryDatabase) {}

  private key(bucket: string, path: string) {
    return `${bucket}/${path}`;
  }

  seed(bucket: string, path: string, body: string) {
    this.objects.set(this.key(bucket, path), body);
  }

  has(bucket: string, path: string) {
    return this.objects.has(this.key(bucket, path));
  }

  allows(userId: string | null, operation: Operation, bucket: string, path: string): boolean {
    const role = userId ? 'authenticated' : 'anon';
    const companyId = objectCompanyId(path);

    return this.policies.some((policy) => {
      if (policy.bucket !== bucket || policy.operation !== operation) return false;
      if (policy.role !== 'public' && policy.role !== role) return false;
      switch (policy.rule.kind) {
        case 'open':
          return true;
        case 'member':
          return Boolean(userId && companyId && isActiveMember(this.db, userId, companyId));
        case 'permission':
          return Boolean(companyId && memberHasPermission(this.db, userId, companyId, policy.rule.code));
      }
    });
  }

  /** GET /storage/v1/object/public/{bucket}/{path}: não passa por RLS. */
  downloadPublic(bucket: string, path: string): string | null {
    if (!this.buckets[bucket]) return null;
    return this.objects.get(this.key(bucket, path)) ?? null;
  }

  /** GET /storage/v1/object/sign/{bucket}/{path}?token=...: só valida o token. */
  downloadSigned(signedUrl: string): string | null {
    const url = new URL(signedUrl);
    const token = url.searchParams.get('token') ?? '';
    const [payload, signature] = token.split('.');
    if (!payload || sign(payload) !== signature) return null;

    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString()) as {
      url: string;
      exp: number;
    };
    const requested = decodeURIComponent(url.pathname.replace('/storage/v1/object/sign/', ''));
    if (claims.url !== requested || claims.exp <= this.now) return null;
    return this.objects.get(claims.url) ?? null;
  }

  /** Cliente `supabase.storage` com a sessão de `userId`. */
  clientFor(userId: string | null) {
    return {from: (bucket: string) => this.bucketApi(userId, bucket)};
  }

  private bucketApi(userId: string | null, bucket: string) {
    const can = (operation: Operation, path: string) =>
      this.allows(userId, operation, bucket, path);

    return {
      upload: async (path: string, body: unknown, options?: {upsert?: boolean}) => {
        const exists = this.has(bucket, path);
        const allowed = exists
          ? Boolean(options?.upsert) && can('select', path) && can('update', path)
          : can('insert', path);
        if (!allowed) return {data: null, error: RLS_ERROR};
        this.seed(bucket, path, String(body));
        return {data: {path}, error: null};
      },

      remove: async (paths: string[]) => {
        const removed = paths.filter(
          (path) => this.has(bucket, path) && can('select', path) && can('delete', path),
        );
        for (const path of removed) this.objects.delete(this.key(bucket, path));
        return {data: removed.map((name) => ({name})), error: null};
      },

      move: async (from: string, to: string) => {
        // UPDATE sem WITH CHECK: a linha nova também precisa passar no USING.
        if (!this.has(bucket, from) || !can('select', from) || !can('update', from) || !can('update', to)) {
          return {data: null, error: NOT_FOUND};
        }
        this.seed(bucket, to, this.objects.get(this.key(bucket, from))!);
        this.objects.delete(this.key(bucket, from));
        return {data: {message: 'Successfully moved'}, error: null};
      },

      list: async (prefix: string, _options?: {limit?: number}) => {
        const folder = `${bucket}/${prefix}/`;
        const data = [...this.objects.keys()]
          .filter((key) => key.startsWith(folder) && !key.slice(folder.length).includes('/'))
          .map((key) => key.slice(bucket.length + 1))
          .filter((path) => can('select', path))
          .map((path) => ({name: path.slice(prefix.length + 1)}));
        return {data, error: null};
      },

      createSignedUrl: async (path: string, expiresIn: number) => {
        if (!this.has(bucket, path) || !can('select', path)) {
          return {data: null, error: NOT_FOUND};
        }
        const payload = Buffer.from(
          JSON.stringify({url: this.key(bucket, path), exp: this.now + expiresIn * 1000}),
        ).toString('base64url');
        const signedUrl = `${SIGNED_HOST}/storage/v1/object/sign/${bucket}/${path}?token=${payload}.${sign(payload)}`;
        return {data: {signedUrl}, error: null};
      },
    };
  }
}
