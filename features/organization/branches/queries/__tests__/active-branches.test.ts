import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {beforeEach, describe, expect, it, vi} from 'vitest';

type Row = Record<string, unknown>;

let adminClient: unknown = null;

vi.mock('@/supabase/server/admin', () => ({
  createAdminClient: () => {
    if (!adminClient) throw new Error('service role indisponível');
    return adminClient;
  },
}));

vi.mock('next/cache', () => ({
  unstable_cache: (fn: () => unknown) => fn,
  revalidateTag: () => {},
}));

vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  cache: <T>(fn: T) => fn,
}));

import {
  countActiveBranches,
  getBranchById,
  listBranches,
  listBranchesForSelect,
  setBranchStatus,
} from '../branches';

const COMPANY_ID = 'company-a';
const OTHER_COMPANY_ID = 'company-b';
const PROFILE_ID = 'profile-1';
const ROOT = resolve(__dirname, '../../../../..');

function branch(overrides: Partial<Row> & {id: string; name: string}): Row {
  return {
    company_id: COMPANY_ID,
    code: overrides.id.toUpperCase(),
    tax_id: null,
    is_headquarters: false,
    address_street: null,
    address_city: null,
    address_state: null,
    address_zip: null,
    phone: null,
    responsible_name: null,
    status: 'active',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    deleted_at: null,
    ...overrides,
  };
}

/** 2 ativas, 1 inativa, 1 bloqueada, 1 soft-deletada, 1 de outra empresa. */
function mixedBranches(): Row[] {
  return [
    branch({id: 'br-zeta', name: 'Zeta'}),
    branch({id: 'br-matriz', name: 'Matriz', is_headquarters: true}),
    branch({id: 'br-inativa', name: 'Alfa Inativa', status: 'inactive'}),
    branch({id: 'br-bloqueada', name: 'Beta Bloqueada', status: 'blocked'}),
    branch({
      id: 'br-excluida',
      name: 'Aaa Excluida',
      status: 'archived',
      deleted_at: '2026-02-01T00:00:00.000Z',
    }),
    branch({
      id: 'br-outra-empresa',
      name: 'Aaa Outra Empresa',
      company_id: OTHER_COMPANY_ID,
    }),
  ];
}

type Filter = {op: 'eq' | 'is'; column: string; value: unknown};

/** Fake PostgREST in-memory: aplica eq/is/order/limit/count/update de verdade. */
function createFakeSupabase(tables: Record<string, Row[]>) {
  const touchedTables: string[] = [];
  const queries: Array<{table: string; filters: Filter[]}> = [];

  function from(table: string) {
    touchedTables.push(table);
    const filters: Filter[] = [];
    const orders: Array<{column: string; ascending: boolean}> = [];
    let limit: number | undefined;
    let columns = '*';
    let head = false;
    let withCount = false;
    let updatePayload: Row | null = null;
    queries.push({table, filters});

    function project(row: Row): Row {
      if (columns === '*') return {...row};
      return Object.fromEntries(
        columns.split(',').map((c) => c.trim()).map((c) => [c, row[c] ?? null]),
      );
    }

    function execute() {
      let rows = (tables[table] ?? []).filter((row) =>
        filters.every((f) =>
          f.op === 'is'
            ? (row[f.column] ?? null) === f.value
            : row[f.column] === f.value,
        ),
      );

      if (updatePayload) {
        for (const row of rows) Object.assign(row, updatePayload);
      }

      rows = [...rows].sort((a, b) => {
        for (const {column, ascending} of orders) {
          const av = a[column] as string | boolean;
          const bv = b[column] as string | boolean;
          if (av === bv) continue;
          const cmp = av > bv ? 1 : -1;
          return ascending ? cmp : -cmp;
        }
        return 0;
      });

      if (limit !== undefined) rows = rows.slice(0, limit);

      return Promise.resolve({
        data: head ? null : rows.map(project),
        count: withCount ? rows.length : null,
        error: null,
      });
    }

    const builder = {
      select(cols: string, opts?: {count?: string; head?: boolean}) {
        columns = cols;
        head = Boolean(opts?.head);
        withCount = opts?.count === 'exact';
        return builder;
      },
      update(payload: Row) {
        updatePayload = payload;
        return builder;
      },
      eq(column: string, value: unknown) {
        filters.push({op: 'eq', column, value});
        return builder;
      },
      is(column: string, value: unknown) {
        filters.push({op: 'is', column, value});
        return builder;
      },
      or() {
        return builder;
      },
      order(column: string, opts?: {ascending?: boolean}) {
        orders.push({column, ascending: opts?.ascending ?? true});
        return builder;
      },
      limit(n: number) {
        limit = n;
        return builder;
      },
      range(fromIndex: number, toIndex: number) {
        limit = toIndex - fromIndex + 1;
        return builder;
      },
      single() {
        return execute().then((r) => ({...r, data: r.data?.[0] ?? null}));
      },
      maybeSingle() {
        return execute().then((r) => ({...r, data: r.data?.[0] ?? null}));
      },
      then<T>(
        onFulfilled: (value: Awaited<ReturnType<typeof execute>>) => T,
        onRejected?: (reason: unknown) => T,
      ) {
        return execute().then(onFulfilled, onRejected);
      },
    };

    return builder;
  }

  return {client: {from}, touchedTables, queries};
}

beforeEach(() => {
  adminClient = null;
});

describe('Audit #18 — countActiveBranches', () => {
  it('filial ativa entra na contagem', async () => {
    const {client} = createFakeSupabase({
      branches: [branch({id: 'br-1', name: 'Única'})],
    });
    await expect(countActiveBranches(client as never, COMPANY_ID)).resolves.toBe(1);
  });

  it('filial inativa não entra na contagem', async () => {
    const {client} = createFakeSupabase({
      branches: [branch({id: 'br-1', name: 'Inativa', status: 'inactive'})],
    });
    await expect(countActiveBranches(client as never, COMPANY_ID)).resolves.toBe(0);
  });

  it('filial soft-deletada não entra na contagem (mesmo se status ficou active)', async () => {
    const {client} = createFakeSupabase({
      branches: [
        branch({
          id: 'br-1',
          name: 'Excluída',
          status: 'archived',
          deleted_at: '2026-02-01T00:00:00.000Z',
        }),
        branch({
          id: 'br-2',
          name: 'Excluída legado',
          deleted_at: '2026-02-01T00:00:00.000Z',
        }),
      ],
    });
    await expect(countActiveBranches(client as never, COMPANY_ID)).resolves.toBe(0);
  });

  it('mistura: 2 ativas + inativa + bloqueada + soft-deletada + outra empresa = 2', async () => {
    const {client, queries} = createFakeSupabase({branches: mixedBranches()});

    await expect(countActiveBranches(client as never, COMPANY_ID)).resolves.toBe(2);
    expect(queries[0].filters).toEqual(
      expect.arrayContaining([
        {op: 'eq', column: 'company_id', value: COMPANY_ID},
        {op: 'is', column: 'deleted_at', value: null},
        {op: 'eq', column: 'status', value: 'active'},
      ]),
    );
  });

  it('filial ativa de outra empresa nunca é contabilizada', async () => {
    const {client} = createFakeSupabase({
      branches: [
        branch({id: 'br-b1', name: 'B1', company_id: OTHER_COMPANY_ID}),
        branch({id: 'br-b2', name: 'B2', company_id: OTHER_COMPANY_ID}),
      ],
    });
    await expect(countActiveBranches(client as never, COMPANY_ID)).resolves.toBe(0);
    await expect(countActiveBranches(client as never, OTHER_COMPANY_ID)).resolves.toBe(2);
  });
});

describe.each([
  {path: 'fallback (client do usuário)', useAdminCache: false},
  {path: 'cache (service role)', useAdminCache: true},
])('Audit #18 — listBranchesForSelect via $path', ({useAdminCache}) => {
  function setup(rows: Row[]) {
    const fake = createFakeSupabase({branches: rows});
    if (useAdminCache) adminClient = fake.client;
    const userClient = useAdminCache
      ? {
          from: () => {
            throw new Error('client do usuário não deveria ser usado com cache');
          },
        }
      : fake.client;
    return {userClient, fake};
  }

  it('ativa aparece; inativa, bloqueada, soft-deletada e outra empresa não', async () => {
    const {userClient} = setup(mixedBranches());

    const options = await listBranchesForSelect(userClient as never, COMPANY_ID);

    expect(options.map((o) => o.id)).toEqual(['br-matriz', 'br-zeta']);
  });

  it('mantém ordenação atual (matriz primeiro, depois nome) e IDs/labels corretos', async () => {
    const {userClient} = setup([
      branch({id: 'br-c', name: 'Campinas', code: 'CPS'}),
      branch({id: 'br-a', name: 'Araraquara', code: 'ARQ'}),
      branch({id: 'br-hq', name: 'São Paulo', code: 'SP', is_headquarters: true}),
      branch({id: 'br-x', name: 'Bauru', code: 'BAU', status: 'inactive'}),
    ]);

    const options = await listBranchesForSelect(userClient as never, COMPANY_ID);

    expect(options).toEqual([
      {id: 'br-hq', name: 'São Paulo', code: 'SP'},
      {id: 'br-a', name: 'Araraquara', code: 'ARQ'},
      {id: 'br-c', name: 'Campinas', code: 'CPS'},
    ]);
  });

  it('filial de outra empresa nunca aparece (company_id preservado)', async () => {
    const {userClient, fake} = setup([
      branch({id: 'br-b', name: 'Outra', company_id: OTHER_COMPANY_ID}),
    ]);

    const options = await listBranchesForSelect(userClient as never, COMPANY_ID);

    expect(options).toEqual([]);
    expect(fake.queries[0].filters).toContainEqual({
      op: 'eq',
      column: 'company_id',
      value: COMPANY_ID,
    });
  });

  it('includeInactive (filtros históricos) mantém inativas, mas nunca soft-deletadas ou de outra empresa', async () => {
    const {userClient} = setup(mixedBranches());

    const options = await listBranchesForSelect(userClient as never, COMPANY_ID, 100, {
      includeInactive: true,
    });

    expect(options.map((o) => o.id)).toEqual([
      'br-matriz',
      'br-inativa',
      'br-bloqueada',
      'br-zeta',
    ]);
  });
});

describe('Audit #18 — histórico preservado', () => {
  it('inativar filial só altera status da filial; registros históricos permanecem', async () => {
    const branches = [branch({id: 'br-1', name: 'Filial 1'})];
    const trips = [{id: 'trip-1', company_id: COMPANY_ID, branch_id: 'br-1'}];
    const financial = [{id: 'fe-1', company_id: COMPANY_ID, branch_id: 'br-1'}];
    const {client, touchedTables} = createFakeSupabase({
      branches,
      trips,
      financial_entries: financial,
    });

    const updated = await setBranchStatus(
      client as never,
      COMPANY_ID,
      'br-1',
      'inactive',
      PROFILE_ID,
    );

    expect(updated.status).toBe('inactive');
    expect(branches[0].deleted_at).toBeNull();
    expect(touchedTables).toEqual(['branches']);
    expect(trips).toEqual([{id: 'trip-1', company_id: COMPANY_ID, branch_id: 'br-1'}]);
    expect(financial).toEqual([{id: 'fe-1', company_id: COMPANY_ID, branch_id: 'br-1'}]);
    await expect(countActiveBranches(client as never, COMPANY_ID)).resolves.toBe(0);
  });

  it('filial inativa continua resolvível por ID (labels históricos) e na listagem de gestão', async () => {
    const {client} = createFakeSupabase({branches: mixedBranches()});

    const byId = await getBranchById(client as never, COMPANY_ID, 'br-inativa');
    expect(byId?.name).toBe('Alfa Inativa');
    expect(byId?.status).toBe('inactive');

    const management = await listBranches(client as never, {companyId: COMPANY_ID});
    expect(management.items.map((b) => b.id)).toContain('br-inativa');
    expect(management.items.map((b) => b.id)).not.toContain('br-excluida');
    expect(management.items.map((b) => b.id)).not.toContain('br-outra-empresa');
  });
});

describe('Audit #18 — contratos de uso (regressão)', () => {
  function read(relativePath: string) {
    return readFileSync(resolve(ROOT, relativePath), 'utf8');
  }

  it('dashboard executivo usa countActiveBranches compartilhado', () => {
    const source = read('features/organization/dashboard/queries/dashboard.ts');
    expect(source).toContain('countActiveBranches(supabase, companyId)');
  });

  it('filtros analíticos (DRE e dashboard de combustível) mantêm filiais históricas', () => {
    expect(read('features/dre/loaders/operational-dre-loader.ts')).toContain(
      'listBranchesForSelect(supabase, companyId, 100, {includeInactive: true})',
    );
    expect(read('app/(dashboard)/abastecimentos/dashboard/page.tsx')).toContain(
      'listBranchesForSelect(supabase, companyId, 100, {includeInactive: true})',
    );
  });

  it('query direta e cache usam a mesma definição de filial ativa', () => {
    for (const file of [
      'features/organization/branches/queries/branches.ts',
      'lib/cache/reference-data.ts',
    ]) {
      expect(read(file)).toContain("query.eq('status', ACTIVE_BRANCH_STATUS)");
    }
  });
});
