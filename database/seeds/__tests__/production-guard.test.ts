import {mkdirSync, mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

const createClientMock = vi.hoisted(() => vi.fn(() => ({})));
const execSyncMock = vi.hoisted(() => vi.fn());

vi.mock('@supabase/supabase-js', () => ({createClient: createClientMock}));
vi.mock('node:child_process', () => ({execSync: execSyncMock}));
// Os testes não podem depender de um .env.local da máquina.
vi.mock('../demo/env', () => ({loadLocalEnv: vi.fn()}));

import {
  assertWritableLinkedProject,
  assertWritableProjectRef,
  assertWritableSupabaseUrl,
  isProductionProjectRef,
  PRODUCTION_PROJECT_REFS,
  ProductionTargetBlockedError,
  SUPABASE_LINKED_PROJECT_REF_FILE,
} from '../production-guard';
import {HML_AUTHORIZED_PROJECT_REF} from '../homologacao/constants';
import {HML_COMPANY_RESET_PROJECT_REF} from '../homologacao/company-reset';
import {HML_HARD_DELETE_PROJECT_REF} from '../homologacao/hard-delete';

const PROD_REF = 'aobfjjaucdrwybebosxm';
const PROD_URL = `https://${PROD_REF}.supabase.co`;
const OTHER_URL = 'https://hmlprojectref0000000.supabase.co';
const ROOT = resolve(__dirname, '..', '..', '..');

const ENV_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'HML_ADMIN_EMAIL',
  'HML_ADMIN_PASSWORD',
] as const;
const snapshot: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) snapshot[key] = process.env[key];
  createClientMock.mockClear();
  execSyncMock.mockClear();
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = snapshot[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function source(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), 'utf8');
}

describe('trava de produção — regras', () => {
  it('o projeto com dados reais está na lista de produção', () => {
    expect(PRODUCTION_PROJECT_REFS).toEqual([PROD_REF]);
    expect(isProductionProjectRef(PROD_REF)).toBe(true);
    expect(isProductionProjectRef(PROD_REF.toUpperCase())).toBe(true);
    expect(isProductionProjectRef('outroprojeto')).toBe(false);
    expect(isProductionProjectRef(null)).toBe(false);
  });

  it('bloqueia a URL de produção e devolve o ref de outro projeto', () => {
    expect(() => assertWritableSupabaseUrl(PROD_URL, 'teste')).toThrow(ProductionTargetBlockedError);
    expect(() => assertWritableSupabaseUrl(`${PROD_URL}/`, 'teste')).toThrow(/guarda dados reais/);
    expect(() => assertWritableSupabaseUrl(`https://${PROD_REF.toUpperCase()}.SUPABASE.CO`, 'teste')).toThrow(
      ProductionTargetBlockedError,
    );
    expect(assertWritableSupabaseUrl(OTHER_URL, 'teste')).toBe('hmlprojectref0000000');
  });

  it('é fail-closed: URL ausente, vazia, inválida ou de outro host bloqueia, sem ecoar a URL', () => {
    for (const bad of [undefined, null, '', '   ', 'not-a-url', 'https://example.com', `https://${PROD_REF}.example.com`]) {
      expect(() => assertWritableSupabaseUrl(bad, 'teste')).toThrow(ProductionTargetBlockedError);
      try {
        assertWritableSupabaseUrl(bad, 'teste');
      } catch (error) {
        const message = (error as Error).message;
        expect(message).not.toMatch(/https?:\/\//);
        expect(message).not.toMatch(/example\.com/);
      }
    }
    expect(() => assertWritableProjectRef('', 'teste')).toThrow(/project-ref ausente/);
  });

  it('projeto vinculado à CLI: bloqueia produção e arquivo ausente; libera outro projeto', () => {
    const dir = mkdtempSync(join(tmpdir(), 'fleet-guard-'));
    expect(() => assertWritableLinkedProject('teste', dir)).toThrow(/ausente/);

    mkdirSync(join(dir, 'supabase', '.temp'), {recursive: true});
    writeFileSync(join(dir, SUPABASE_LINKED_PROJECT_REF_FILE), `${PROD_REF}\n`);
    expect(() => assertWritableLinkedProject('teste', dir)).toThrow(ProductionTargetBlockedError);

    writeFileSync(join(dir, SUPABASE_LINKED_PROJECT_REF_FILE), 'hmlprojectref0000000');
    expect(assertWritableLinkedProject('teste', dir)).toBe('hmlprojectref0000000');
  });

  it('os alvos das ferramentas de HML são hoje o projeto de produção: todas bloqueiam', () => {
    for (const ref of [HML_AUTHORIZED_PROJECT_REF, HML_COMPANY_RESET_PROJECT_REF, HML_HARD_DELETE_PROJECT_REF]) {
      expect(() => assertWritableProjectRef(ref, 'HML')).toThrow(ProductionTargetBlockedError);
    }
  });
});

describe('trava de produção — demo (service role)', () => {
  it('seed/reset da demo bloqueia a produção antes de exigir chave e de criar o cliente', async () => {
    const {createDemoSeedClient} = await import('../demo/client');

    process.env.NEXT_PUBLIC_SUPABASE_URL = PROD_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(() => createDemoSeedClient()).toThrow(ProductionTargetBlockedError);

    process.env.SUPABASE_SERVICE_ROLE_KEY = 'chave-falsa-de-teste';
    expect(() => createDemoSeedClient()).toThrow(ProductionTargetBlockedError);

    expect(createClientMock).not.toHaveBeenCalled();
  });

  it('runDemoReset bloqueia antes de qualquer consulta, exclusão ou chamada à CLI', async () => {
    const {runDemoReset} = await import('../demo/reset-demo');
    process.env.NEXT_PUBLIC_SUPABASE_URL = PROD_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'chave-falsa-de-teste';

    await expect(runDemoReset()).rejects.toThrow(ProductionTargetBlockedError);
    expect(createClientMock).not.toHaveBeenCalled();
    expect(execSyncMock).not.toHaveBeenCalled();
  });

  it('em outro projeto a demo segue o fluxo normal (cria o cliente)', async () => {
    const {createDemoSeedClient} = await import('../demo/client');
    process.env.NEXT_PUBLIC_SUPABASE_URL = OTHER_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'chave-falsa-de-teste';
    createDemoSeedClient();
    expect(createClientMock).toHaveBeenCalledTimes(1);
  });
});

describe('trava de produção — homologação (anon + admin)', () => {
  it('createHmlAuthenticatedClient bloqueia antes de criar o cliente e de autenticar', async () => {
    const {createHmlAuthenticatedClient} = await import('../homologacao/client');
    process.env.NEXT_PUBLIC_SUPABASE_URL = PROD_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-falsa';
    process.env.HML_ADMIN_EMAIL = 'admin@example.invalid';
    process.env.HML_ADMIN_PASSWORD = 'senha-falsa';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    await expect(createHmlAuthenticatedClient()).rejects.toThrow(ProductionTargetBlockedError);
    expect(createClientMock).not.toHaveBeenCalled();
  });
});

describe('trava de produção — contrato dos pontos de entrada', () => {
  function expectBefore(text: string, first: string, second: string) {
    const a = text.indexOf(first);
    const b = text.indexOf(second);
    expect(a, `ausente: ${first}`).toBeGreaterThanOrEqual(0);
    expect(b, `ausente: ${second}`).toBeGreaterThanOrEqual(0);
    expect(a, `${first} deve vir antes de ${second}`).toBeLessThan(b);
  }

  it('demo: trava antes do createClient e antes do supabase --linked', () => {
    expectBefore(source('database/seeds/demo/client.ts'), 'assertWritableSupabaseUrl(url', 'createClient<Database>(');
    const reset = source('database/seeds/demo/reset-demo.ts');
    expectBefore(reset, 'assertWritableLinkedProject(', 'execSync(');
  });

  it('HML: trava no início de requireHmlAuthEnv e nos guards destrutivos', () => {
    const env = source('database/seeds/homologacao/env.ts');
    const body = env.slice(env.indexOf('export function requireHmlAuthEnv'));
    expectBefore(body, 'assertHmlWriteTargetFromEnv()', 'process.env.HML_ADMIN_PASSWORD');
    const fromEnv = env.slice(env.indexOf('export function assertHmlProjectRefFromEnv'));
    expectBefore(fromEnv, 'assertWritableSupabaseUrl(url, HML_WRITE_TOOL)', 'return assertHmlAuthorizedProjectRef(url)');
  });

  it('scripts de HML: trava antes de qualquer plano, leitura ou escrita', () => {
    const reset = source('scripts/prepare-hml-company-reset.ts');
    const resetMain = reset.slice(reset.indexOf('function main'));
    expectBefore(resetMain, 'assertWritableProjectRef(HML_COMPANY_RESET_PROJECT_REF', 'inspectHmlEnvUrlProjectRef(');

    const hardDelete = source('scripts/prepare-hml-hard-delete.ts');
    const hardDeleteMain = hardDelete.slice(hardDelete.indexOf('function main'));
    expectBefore(hardDeleteMain, 'assertWritableProjectRef(HML_HARD_DELETE_PROJECT_REF', 'inspectHmlEnvUrlProjectRef(');

    const recover = source('scripts/recover-hml-partial-soft-delete.ts');
    const recoverMain = recover.slice(recover.indexOf('async function main'));
    expectBefore(recoverMain, 'assertHmlWriteTargetFromEnv()', 'createHmlAuthenticatedClient()');
  });
});

describe('reset_demo_data.sql — trava no próprio SQL', () => {
  const sql = source('scripts/reset_demo_data.sql');
  const code = sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .toLowerCase();

  it('a trava roda dentro da transação, antes de qualquer exclusão', () => {
    const begin = code.indexOf('begin;');
    const guard = code.indexOf("current_setting('fleetcontrol.confirm_full_wipe', true)");
    const firstDelete = Math.min(
      ...['delete from', 'truncate'].map((kw) => code.indexOf(kw)).filter((i) => i >= 0),
    );
    expect(begin).toBeGreaterThanOrEqual(0);
    expect(guard).toBeGreaterThan(begin);
    expect(guard).toBeLessThan(firstDelete);
    expect(code.indexOf('storage.allow_delete_query')).toBeGreaterThan(guard);
  });

  it('a confirmação vem comentada por padrão', () => {
    expect(code).not.toContain("set_config('fleetcontrol.confirm_full_wipe'");
    expect(sql).toContain("-- select set_config('fleetcontrol.confirm_full_wipe', 'APAGAR-TODOS-OS-DADOS-FICTICIOS', true);");
  });

  it('só aceita as 5 empresas fictícias conhecidas', () => {
    const ids = [
      '8fd9ec35-68e2-4189-8b2f-bcabd0f3fbde',
      '8c8c76fc-cd4a-4d88-b573-4f21dd9457c0',
      'fb816db7-e94c-4f82-b42e-d72d87cb8acb',
      'f9fb4725-93dc-4a1c-8cb8-ee87ed5fcc35',
      '451a7940-a56b-425f-ae5f-e493d536591f',
    ];
    for (const id of ids) expect(code).toContain(`'${id}'`);
    expect(code.match(/'[0-9a-f-]{36}'/g)?.length).toBe(ids.length);
    expect(code).toContain('where not (c.id = any (v_fictitious))');
    expect(code).toMatch(/raise exception\s+'reset_demo_data\.sql bloqueado/);
  });
});
