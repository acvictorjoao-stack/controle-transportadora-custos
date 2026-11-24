import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join, relative, resolve} from 'node:path';

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

const createBrowserClientMock = vi.hoisted(() => vi.fn(() => ({auth: {}})));
const createServerClientMock = vi.hoisted(() => vi.fn(() => ({auth: {}})));
const createClientMock = vi.hoisted(() => vi.fn(() => ({auth: {}})));

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: createBrowserClientMock,
  createServerClient: createServerClientMock,
}));
vi.mock('@supabase/supabase-js', () => ({createClient: createClientMock}));
vi.mock('next/headers', () => ({
  cookies: async () => ({getAll: () => [], set: () => undefined}),
}));

import {
  decideSupabaseAccess,
  PRODUCTION_SUPABASE_PROJECT_REFS,
  projectRefFromSupabaseUrl,
  resolveDeploymentEnvironment,
  resolveSupabaseAccessContext,
  type SupabaseAccessContext,
} from '../deployment-guard';

const PROD_REF = 'aobfjjaucdrwybebosxm';
const PROD_URL = `https://${PROD_REF}.supabase.co`;
const HML_URL = 'https://hmlprojectref0000000.supabase.co';
const ANON = 'anon-falsa-de-teste';
const SERVICE = 'service-role-falsa-de-teste';
const ROOT = resolve(__dirname, '..', '..', '..');
// vi.resetModules() recarrega os módulos: a classe do erro muda de identidade,
// então a verificação é pelo nome e pela mensagem padrão do bloqueio.
const BLOCKED = /^Acesso ao banco bloqueado neste deployment/;

type Scenario = {deployment?: string; runtime?: string; url?: string; service?: boolean};

function applyScenario({deployment, runtime, url, service}: Scenario) {
  vi.unstubAllEnvs();
  vi.stubEnv('FLEETCONTROL_DEPLOYMENT_ENV', deployment ?? '');
  if (deployment === undefined) delete process.env.FLEETCONTROL_DEPLOYMENT_ENV;
  vi.stubEnv('VERCEL_ENV', runtime ?? '');
  if (runtime === undefined) delete process.env.VERCEL_ENV;
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', url ?? '');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', ANON);
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', service ? SERVICE : '');
}

function expectSafeMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  expect(message).not.toContain(PROD_REF);
  expect(message).not.toMatch(/https?:\/\//);
  expect(message).not.toContain(ANON);
  expect(message).not.toContain(SERVICE);
}

beforeEach(() => {
  vi.resetModules();
  createBrowserClientMock.mockClear();
  createServerClientMock.mockClear();
  createClientMock.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('trava de Preview — regras puras', () => {
  it('a lista de produção é o projeto do piloto', () => {
    expect(PRODUCTION_SUPABASE_PROJECT_REFS).toEqual([PROD_REF]);
  });

  it('identifica o ambiente da Vercel no build (fora da Vercel = local)', () => {
    expect(resolveDeploymentEnvironment({})).toBe('local');
    expect(resolveDeploymentEnvironment({VERCEL: '1', VERCEL_ENV: 'production'})).toBe('production');
    expect(resolveDeploymentEnvironment({VERCEL: '1', VERCEL_ENV: 'preview'})).toBe('preview');
    expect(resolveDeploymentEnvironment({VERCEL_ENV: 'development'})).toBe('development');
    expect(resolveDeploymentEnvironment({VERCEL: '1'})).toBe('unknown');
    expect(resolveDeploymentEnvironment({VERCEL_URL: 'x.vercel.app', VERCEL_ENV: 'staging'})).toBe('unknown');
  });

  it('resolve o contexto de acesso (runtime Preview prevalece; dúvida = não identificado)', () => {
    const ctx = (builtEnvironment?: string, runtimeVercelEnv?: string, nodeEnv = 'production') =>
      resolveSupabaseAccessContext({builtEnvironment, runtimeVercelEnv, nodeEnv});
    expect(ctx('production', 'production')).toBe('production');
    expect(ctx('production', undefined)).toBe('production');
    expect(ctx('production', 'preview')).toBe('preview');
    expect(ctx('production', 'development')).toBe('vercel-development');
    expect(ctx('preview', undefined)).toBe('preview');
    expect(ctx('preview', 'production')).toBe('preview');
    expect(ctx('development', undefined)).toBe('vercel-development');
    expect(ctx('unknown', undefined)).toBe('unidentified');
    expect(ctx('valor-estranho', undefined)).toBe('unidentified');
    expect(ctx(undefined, 'production')).toBe('unidentified');
    expect(ctx('local', undefined, 'development')).toBe('local-development');
    expect(ctx('local', undefined, 'test')).toBe('local-development');
    expect(ctx(undefined, undefined, 'development')).toBe('local-development');
    // `next start` fora da Vercel ou build sem ambiente: não é dev local.
    expect(ctx('local', undefined, 'production')).toBe('unidentified');
    expect(ctx(undefined, undefined, 'production')).toBe('unidentified');
  });

  it('matriz de decisão', () => {
    const decide = (context: SupabaseAccessContext, url?: string) => decideSupabaseAccess({url, context});
    for (const context of ['preview', 'vercel-development', 'unidentified'] as const) {
      expect(decide(context, PROD_URL)).toMatchObject({allowed: false, reason: 'production_database_blocked'});
      expect(decide(context, `https://${PROD_REF.toUpperCase()}.SUPABASE.CO/`)).toMatchObject({allowed: false});
      expect(decide(context, undefined)).toMatchObject({allowed: false, reason: 'missing_url'});
      expect(decide(context, '   ')).toMatchObject({allowed: false, reason: 'missing_url'});
      expect(decide(context, 'not-a-url')).toMatchObject({allowed: false, reason: 'invalid_url'});
      expect(decide(context, 'https://example.com')).toMatchObject({allowed: false, reason: 'invalid_url'});
      expect(decide(context, `http://${PROD_REF}.supabase.co`)).toMatchObject({allowed: false, reason: 'invalid_url'});
      expect(decide(context, `https://${PROD_REF}.supabase.co.evil.com`)).toMatchObject({allowed: false});
      expect(decide(context, HML_URL)).toMatchObject({allowed: true});
    }
    expect(decide('production', PROD_URL)).toMatchObject({allowed: true});
    expect(decide('local-development', PROD_URL)).toMatchObject({allowed: true});
    expect(decide('local-development', 'http://127.0.0.1:54321')).toMatchObject({allowed: true});
    expect(projectRefFromSupabaseUrl(`https://${PROD_REF}.supabase.co`)).toBe(PROD_REF);
  });
});

describe('trava de Preview — getSupabaseEnv (todos os clientes passam por aqui)', () => {
  it.each([
    ['1. Preview com URL de produção', {deployment: 'preview', url: PROD_URL}],
    ['4. Preview sem URL', {deployment: 'preview', url: undefined}],
    ['5. Preview com URL inválida', {deployment: 'preview', url: 'https://example.com'}],
    ['Development da Vercel com URL de produção', {deployment: 'development', url: PROD_URL}],
    ['Ambiente não identificado na Vercel', {deployment: 'unknown', url: PROD_URL}],
    ['Build de produção, runtime dizendo Preview', {deployment: 'production', runtime: 'preview', url: PROD_URL}],
  ])('%s: bloqueado, sem vazar URL nem chaves', async (_title, scenario) => {
    applyScenario(scenario);
    const {getSupabaseEnv} = await import('../env');
    expect(() => getSupabaseEnv()).toThrow(BLOCKED);
    try {
      getSupabaseEnv();
    } catch (error) {
      expectSafeMessage(error);
    }
  });

  it('6. Production com a URL de produção: permitido', async () => {
    applyScenario({deployment: 'production', runtime: 'production', url: PROD_URL});
    const {getSupabaseEnv} = await import('../env');
    expect(getSupabaseEnv()).toEqual({url: PROD_URL, anonKey: ANON});
  });

  it('7. Desenvolvimento local (next dev / testes): permitido', async () => {
    applyScenario({deployment: 'local', url: PROD_URL});
    const {getSupabaseEnv} = await import('../env');
    expect(getSupabaseEnv().url).toBe(PROD_URL);
  });

  it('Preview com um projeto de homologação: permitido', async () => {
    applyScenario({deployment: 'preview', url: HML_URL});
    const {getSupabaseEnv} = await import('../env');
    expect(getSupabaseEnv().url).toBe(HML_URL);
  });
});

describe('trava de Preview — cada ponto de acesso (8 e 9)', () => {
  const PREVIEW_PROD = {deployment: 'preview', url: PROD_URL, service: true} satisfies Scenario;

  it('navegador (Client Components): bloqueado sem criar cliente', async () => {
    applyScenario(PREVIEW_PROD);
    const {createClient} = await import('../../client/browser');
    expect(() => createClient()).toThrow(BLOCKED);
    expect(createBrowserClientMock).not.toHaveBeenCalled();
  });

  it('3. servidor com anon key (Server Components e Server Actions): bloqueado', async () => {
    applyScenario(PREVIEW_PROD);
    const {createClient} = await import('../../server/server');
    await expect(createClient()).rejects.toMatchObject({name: 'SupabaseAccessBlockedError'});
    expect(createServerClientMock).not.toHaveBeenCalled();
  });

  it('rotas de API (route handler): bloqueado', async () => {
    applyScenario(PREVIEW_PROD);
    const {NextRequest} = await import('next/server');
    const {createRouteHandlerClient} = await import('../../auth/route-handler');
    expect(() => createRouteHandlerClient(new NextRequest('https://preview.example/api/x'))).toThrow(BLOCKED);
    expect(createServerClientMock).not.toHaveBeenCalled();
  });

  it('2. service role (createAdminClient): bloqueado antes de ler a chave', async () => {
    applyScenario(PREVIEW_PROD);
    const {createAdminClient} = await import('../../server/admin');
    expect(() => createAdminClient()).toThrow(BLOCKED);
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it('middleware: responde 503 em toda rota sem criar cliente', async () => {
    applyScenario(PREVIEW_PROD);
    const {NextRequest} = await import('next/server');
    const {updateSession} = await import('../../middleware/session');
    for (const path of ['/dashboard', '/login', '/api/storage/x/y', '/financeiro/conciliacao']) {
      const response = await updateSession(new NextRequest(`https://preview.example${path}`, {method: 'POST'}));
      expect(response.status).toBe(503);
      expect(response.headers.get('X-FleetControl-Blocked')).toBe('production_database_blocked');
      const body = await response.text();
      expect(body).toMatch(/Acesso ao banco bloqueado/);
      expectSafeMessage(body);
    }
    expect(createServerClientMock).not.toHaveBeenCalled();
  });

  it('rota de health: bloqueada sem chamar o Supabase', async () => {
    applyScenario(PREVIEW_PROD);
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const {GET} = await import('@/app/api/health/supabase/route');
    const response = await GET();
    expect(response.status).toBe(503);
    expectSafeMessage(JSON.stringify(await response.json()));
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('em produção, os mesmos pontos criam o cliente normalmente', async () => {
    applyScenario({deployment: 'production', runtime: 'production', url: PROD_URL, service: true});
    const browser = await import('../../client/browser');
    browser.createClient();
    const server = await import('../../server/server');
    await server.createClient();
    const admin = await import('../../server/admin');
    admin.createAdminClient();
    const {createSupabaseAccessBlockedResponse} = await import('../../middleware/session');
    expect(createSupabaseAccessBlockedResponse()).toBeNull();
    expect(createBrowserClientMock).toHaveBeenCalledTimes(1);
    expect(createServerClientMock).toHaveBeenCalledTimes(1);
    expect(createClientMock).toHaveBeenCalledTimes(1);
  });
});

describe('trava de Preview — sem caminho alternativo (contrato do código)', () => {
  const SOURCE_DIRS = ['app', 'components', 'features', 'lib', 'supabase', 'hooks', 'providers', 'contexts', 'services', 'stores'];
  const SOURCE_FILES = ['middleware.ts', 'instrumentation.ts'];

  function listSources(): string[] {
    const out: string[] = [];
    const walk = (dir: string) => {
      let entries: string[];
      try {
        entries = readdirSync(dir);
      } catch {
        return;
      }
      for (const name of entries) {
        const full = join(dir, name);
        if (name === 'node_modules' || name === '__tests__' || name === 'migrations' || name === 'types') continue;
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(full);
      }
    };
    for (const d of SOURCE_DIRS) walk(join(ROOT, d));
    for (const f of SOURCE_FILES) out.push(join(ROOT, f));
    return out.map((f) => relative(ROOT, f).replaceAll('\\', '/'));
  }

  const files = listSources();
  const read = (f: string) => readFileSync(join(ROOT, f), 'utf8');

  it('só as 5 fábricas importam construtores do Supabase', () => {
    // [^}] já casa quebras de linha: cobre imports em várias linhas.
    const constructorImport =
      /import\s*\{[^}]*\b(createClient|createBrowserClient|createServerClient)\b[^}]*\}\s*from\s*'@supabase\/(ssr|supabase-js)'/;
    const offenders = files.filter((f) => constructorImport.test(read(f)));
    expect(offenders.sort()).toEqual(
      [
        'supabase/auth/route-handler.ts',
        'supabase/client/browser.ts',
        'supabase/middleware/session.ts',
        'supabase/server/admin.ts',
        'supabase/server/server.ts',
      ].sort(),
    );
    expect(files.filter((f) => /require\(\s*'@supabase\//.test(read(f)))).toEqual([]);
    expect(files.filter((f) => /import\(\s*'@supabase\//.test(read(f)))).toEqual([]);
  });

  it('URL e chaves do Supabase só são lidas nos pontos com trava', () => {
    const envRead = /process\.env\.(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY)\b/;
    const readers = files.filter((f) => envRead.test(read(f)));
    expect(readers.sort()).toEqual(
      ['supabase/middleware/session.ts', 'supabase/server/admin.ts', 'supabase/utils/env.ts'].sort(),
    );
  });

  it('as fábricas usam a configuração validada (getSupabaseEnv/supabaseConfig)', () => {
    for (const f of ['supabase/client/browser.ts', 'supabase/server/server.ts', 'supabase/auth/route-handler.ts']) {
      expect(read(f)).toMatch(/supabaseConfig\.url/);
    }
    const admin = read('supabase/server/admin.ts');
    expect(admin.indexOf('getSupabaseEnv()')).toBeGreaterThan(-1);
    expect(admin.indexOf('getSupabaseEnv()')).toBeLessThan(admin.indexOf('process.env.SUPABASE_SERVICE_ROLE_KEY'));
    const env = read('supabase/utils/env.ts');
    expect(env.indexOf('assertSupabaseAccessAllowed(url)')).toBeGreaterThan(-1);
    expect(env.indexOf('assertSupabaseAccessAllowed(url)')).toBeLessThan(env.indexOf('throw new SupabaseEnvError'));
  });

  it('o middleware decide antes de criar o cliente', () => {
    const session = read('supabase/middleware/session.ts');
    const body = session.slice(session.indexOf('async function updateSessionInternal'));
    expect(body.indexOf('createSupabaseAccessBlockedResponse()')).toBeGreaterThan(-1);
    expect(body.indexOf('createSupabaseAccessBlockedResponse()')).toBeLessThan(body.indexOf('createServerClient<Database>('));
  });

  it('nenhuma chamada direta à API REST do Supabase fora da configuração', () => {
    const direct = files.filter((f) => /fetch\(\s*[`'"]https:\/\/[a-z0-9]+\.supabase\.co/.test(read(f)));
    expect(direct).toEqual([]);
  });

  it('o next.config grava o ambiente do deployment no build', async () => {
    const config = (await import('@/next.config')).default as {env?: Record<string, string>};
    expect(config.env?.FLEETCONTROL_DEPLOYMENT_ENV).toBe(resolveDeploymentEnvironment(process.env));
  });
});
