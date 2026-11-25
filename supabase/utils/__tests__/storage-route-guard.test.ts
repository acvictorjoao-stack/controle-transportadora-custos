import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

const createServerClientMock = vi.hoisted(() => vi.fn());
const cookiesMock = vi.hoisted(() => vi.fn());

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(),
  createServerClient: createServerClientMock,
}));
vi.mock('next/headers', () => ({cookies: cookiesMock}));

const PROD_REF = 'aobfjjaucdrwybebosxm';
const PROD_URL = `https://${PROD_REF}.supabase.co`;
const HML_URL = 'https://hmlprojectref0000000.supabase.co';
const ANON = 'anon-falsa-de-teste';
const SIGNED_URL = 'https://assinada.example/arquivo';
const BUCKET = 'vehicle-files';
const COMPANY = '451a7940-a56b-425f-ae5f-e493d536591f';

// Extensões que o matcher do middleware deixa passar, mais uma comum.
const EXTENSIONS = ['png', 'PNG', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'pdf'];

function applyEnvironment(deployment: 'preview' | 'production' | 'local', url: string) {
  vi.unstubAllEnvs();
  vi.stubEnv('FLEETCONTROL_DEPLOYMENT_ENV', deployment);
  vi.stubEnv('VERCEL_ENV', deployment === 'local' ? '' : deployment);
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', url);
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', ANON);
}

function sessionClient() {
  const createSignedUrl = vi.fn(async () => ({data: {signedUrl: SIGNED_URL}, error: null}));
  const client = {
    auth: {getUser: vi.fn(async () => ({data: {user: {id: 'usuario'}}, error: null}))},
    storage: {from: vi.fn(() => ({createSignedUrl}))},
  };
  return {client, createSignedUrl};
}

async function requestFile(extension: string): Promise<Response> {
  const {GET} = await import('@/app/api/storage/[bucket]/[...path]/route');
  const {NextRequest} = await import('next/server');
  const path = [COMPANY, 'veiculo', `foto.${extension}`];
  return GET(new NextRequest(`https://app.example/api/storage/${BUCKET}/${path.join('/')}`), {
    params: Promise.resolve({bucket: BUCKET, path}),
  });
}

let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.resetModules();
  createServerClientMock.mockReset();
  cookiesMock.mockReset();
  cookiesMock.mockResolvedValue({getAll: () => [], set: () => undefined});
  fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('rede proibida no teste'));
});

afterEach(() => {
  vi.unstubAllEnvs();
  fetchSpy.mockRestore();
});

describe('/api/storage — Preview com o banco de produção', () => {
  it.each(EXTENSIONS)('.%s: 503 neutro, sem cliente e sem rede', async (extension) => {
    applyEnvironment('preview', PROD_URL);

    const response = await requestFile(extension);

    expect(response.status).toBe(503);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('Location')).toBeNull();
    expect(await response.text()).toBe('');
    const exposed = JSON.stringify([...response.headers.entries()]);
    expect(exposed).not.toContain(PROD_REF);
    expect(exposed).not.toContain(ANON);
    expect(exposed).not.toMatch(/supabase/i);
    expect(createServerClientMock).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('/api/storage — só a trava de produção vira 503', () => {
  it.each([
    ['URL ausente em Preview', ''],
    ['URL inválida em Preview', 'https://example.com'],
  ])('%s continua sendo erro comum', async (_title, url) => {
    applyEnvironment('preview', url);
    await expect(requestFile('png')).rejects.toMatchObject({name: 'SupabaseAccessBlockedError'});
    expect(createServerClientMock).not.toHaveBeenCalled();
  });

  it('configuração ausente fora de Preview continua sendo erro comum', async () => {
    applyEnvironment('local', PROD_URL);
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    await expect(requestFile('png')).rejects.toMatchObject({name: 'SupabaseEnvError'});
  });

  it('falha inesperada ao criar o cliente é repassada sem mudança', async () => {
    applyEnvironment('production', PROD_URL);
    const failure = new Error('falha inesperada');
    cookiesMock.mockRejectedValue(failure);
    await expect(requestFile('png')).rejects.toBe(failure);
  });

  it('erro com o mesmo texto da trava, mas de outra classe, é repassado', async () => {
    applyEnvironment('production', PROD_URL);
    const lookalike = Object.assign(new Error('Acesso ao banco bloqueado neste deployment'), {
      name: 'SupabaseAccessBlockedError',
      reason: 'production_database_blocked',
    });
    cookiesMock.mockRejectedValue(lookalike);
    await expect(requestFile('png')).rejects.toBe(lookalike);
  });

  it('falha depois de criado o cliente é repassada sem mudança', async () => {
    applyEnvironment('production', PROD_URL);
    const {client} = sessionClient();
    const failure = new Error('falha do Storage');
    client.auth.getUser.mockRejectedValue(failure);
    createServerClientMock.mockReturnValue(client);
    await expect(requestFile('png')).rejects.toBe(failure);
  });
});

describe('/api/storage — comportamento normal preservado', () => {
  it.each(EXTENSIONS)('Production .%s: redireciona para a URL assinada', async (extension) => {
    applyEnvironment('production', PROD_URL);
    const {client, createSignedUrl} = sessionClient();
    createServerClientMock.mockReturnValue(client);

    const response = await requestFile(extension);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe(SIGNED_URL);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store, max-age=0');
    expect(createServerClientMock).toHaveBeenCalledTimes(1);
    expect(createServerClientMock.mock.calls[0]?.[0]).toBe(PROD_URL);
    expect(createSignedUrl).toHaveBeenCalledTimes(1);
  });

  it('Production sem sessão continua 401', async () => {
    applyEnvironment('production', PROD_URL);
    const {client} = sessionClient();
    client.auth.getUser.mockResolvedValue({data: {user: null}, error: null} as never);
    createServerClientMock.mockReturnValue(client);
    expect((await requestFile('png')).status).toBe(401);
  });

  it('Preview com um projeto de homologação funciona normalmente', async () => {
    applyEnvironment('preview', HML_URL);
    const {client} = sessionClient();
    createServerClientMock.mockReturnValue(client);
    expect((await requestFile('png')).status).toBe(302);
    expect(createServerClientMock.mock.calls[0]?.[0]).toBe(HML_URL);
  });
});
