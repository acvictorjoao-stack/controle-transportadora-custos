/**
 * Audit #22 — alertas de manutenção do Dashboard Executivo no mesmo contexto
 * dimensional dos KPIs.
 *
 * Conceito: "manutenção atrasada" é ALERTA OPERACIONAL DE ESTADO ATUAL —
 * `maintenance_schedules` ativos com `next_due_at < agora`. O período do
 * dashboard não se aplica (vencida hoje continua vencida em período histórico);
 * company/filial/veículo/motorista se aplicam pelas colunas explícitas.
 *
 * A query de manutenção é REAL (fake PostgREST em memória). O fake também
 * implementa a RPC `get_maintenance_stats` company-wide (fonte anterior), de modo
 * que reverter o loader para ela faz estes testes falharem.
 */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import type {OperationalDreData, OperationalDreFilters} from '@/features/dre/types';
import type {FinancialDashboardData} from '@/features/financial-dashboard/types';
import {countOverdueMaintenanceSchedules} from '@/features/maintenance/queries';

import {toIsoDate} from '../../utils/period';
import {
  buildExecutiveDashboardKpis,
  getExecutiveDashboardCore,
  getExecutiveDashboardSecondary,
} from '../executive-dashboard-loader';

const getOperationalDreBundle = vi.hoisted(() => vi.fn());
const getFinancialDashboardData = vi.hoisted(() => vi.fn());
const listRoutesWithoutLeadTime = vi.hoisted(() => vi.fn());

vi.mock('@/features/dre/loaders', () => ({getOperationalDreBundle}));
vi.mock('@/features/financial-dashboard/queries', () => ({getFinancialDashboardData}));
vi.mock('@/features/cadastro-quality/queries', () => ({listRoutesWithoutLeadTime}));

type Row = Record<string, unknown>;
type Filter = {op: 'eq' | 'is' | 'lt'; column: string; value: unknown};

const NOW = '2026-10-05T12:00:00.000Z';

const COMPANY_A = 'company-a';
const COMPANY_B = 'company-b';
const BRANCH_1 = 'branch-1';
const BRANCH_2 = 'branch-2';
const BRANCH_B = 'branch-b';
const VEHICLE_1 = 'vehicle-1';
const VEHICLE_2 = 'vehicle-2';
const VEHICLE_3 = 'vehicle-3';
const VEHICLE_DELETED = 'vehicle-deleted';
const VEHICLE_B = 'vehicle-b';
const DRIVER_1 = 'driver-1';

function schedule(id: string, overrides: Row): Row {
  return {
    id,
    company_id: COMPANY_A,
    branch_id: BRANCH_1,
    vehicle_id: VEHICLE_1,
    driver_id: null,
    is_active: true,
    deleted_at: null,
    next_due_at: '2026-09-20T00:00:00.000Z',
    ...overrides,
  };
}

function seedTables(): Record<string, Row[]> {
  return {
    vehicles: [
      {id: VEHICLE_1, company_id: COMPANY_A, branch_id: BRANCH_1, deleted_at: null},
      {id: VEHICLE_2, company_id: COMPANY_A, branch_id: BRANCH_2, deleted_at: null},
      {id: VEHICLE_3, company_id: COMPANY_A, branch_id: null, deleted_at: null},
      {
        id: VEHICLE_DELETED,
        company_id: COMPANY_A,
        branch_id: BRANCH_1,
        deleted_at: '2026-06-01T00:00:00.000Z',
      },
      {id: VEHICLE_B, company_id: COMPANY_B, branch_id: BRANCH_B, deleted_at: null},
    ],
    maintenance_schedules: [
      // Vencidas e ativas — company A
      schedule('s1-b1-v1', {driver_id: DRIVER_1}),
      schedule('s2-b1-v1-old', {next_due_at: '2025-12-01T00:00:00.000Z'}),
      schedule('s3-b2-v2', {
        branch_id: BRANCH_2,
        vehicle_id: VEHICLE_2,
        next_due_at: '2026-10-01T00:00:00.000Z',
      }),
      schedule('s4-nobranch-v3', {
        branch_id: null,
        vehicle_id: VEHICLE_3,
        next_due_at: '2026-08-01T00:00:00.000Z',
      }),
      // Futura (dentro do mês corrente) — não vencida
      schedule('s5-future', {next_due_at: '2026-10-20T00:00:00.000Z'}),
      // Excluídas / inativas / sem data
      schedule('s6-deleted', {deleted_at: '2026-09-25T00:00:00.000Z'}),
      schedule('s7-inactive', {
        branch_id: BRANCH_2,
        vehicle_id: VEHICLE_2,
        is_active: false,
      }),
      schedule('s8-vehicle-deleted', {vehicle_id: VEHICLE_DELETED}),
      schedule('s10-no-due', {next_due_at: null}),
      // Outra empresa
      schedule('s9-company-b', {
        company_id: COMPANY_B,
        branch_id: BRANCH_B,
        vehicle_id: VEHICLE_B,
      }),
    ],
    maintenance_records: [
      {
        id: 'mr-1',
        company_id: COMPANY_A,
        branch_id: BRANCH_1,
        vehicle_id: VEHICLE_1,
        deleted_at: '2026-05-01T00:00:00.000Z',
      },
    ],
  };
}

interface RecordedQuery {
  table: string;
  columns: string;
  options: {count?: string; head?: boolean} | undefined;
  filters: Filter[];
}

/** Fake PostgREST: eq/is/lt, embed `rel!inner` com filtro `rel.col`, count/head e RPC. */
function createFakeSupabase(tables: Record<string, Row[]>) {
  const queries: RecordedQuery[] = [];
  const rpcCalls: Array<{fn: string; args: Row}> = [];
  const writes: string[] = [];

  function valueOf(row: Row, column: string): unknown {
    if (!column.includes('.')) return row[column] ?? null;
    const [relation, field] = column.split('.') as [string, string];
    const embedded = row[`__${relation}`] as Row | undefined;
    return embedded ? (embedded[field] ?? null) : undefined;
  }

  function matches(row: Row, filter: Filter): boolean {
    const value = valueOf(row, filter.column);
    if (value === undefined) return false;
    if (filter.op === 'lt') {
      return value != null && Date.parse(String(value)) < Date.parse(String(filter.value));
    }
    return value === filter.value;
  }

  function from(table: string) {
    const recorded: RecordedQuery = {table, columns: '*', options: undefined, filters: []};
    queries.push(recorded);

    function execute() {
      const innerRelations = Array.from(
        recorded.columns.matchAll(/(\w+)!inner/g),
        (match) => match[1]!,
      );
      const rows = (tables[table] ?? [])
        .map((row) => {
          const joined: Row = {...row};
          for (const relation of innerRelations) {
            joined[`__${relation}`] = (tables[relation] ?? []).find(
              (candidate) => candidate.id === row[`${relation.replace(/s$/, '')}_id`],
            );
          }
          return joined;
        })
        .filter((row) => innerRelations.every((relation) => row[`__${relation}`]))
        .filter((row) => recorded.filters.every((filter) => matches(row, filter)));
      return {
        data: recorded.options?.head ? null : rows,
        count: recorded.options?.count ? rows.length : null,
        error: null,
      };
    }

    const builder = {
      select(columns: string, options?: RecordedQuery['options']) {
        recorded.columns = columns;
        recorded.options = options;
        return builder;
      },
      eq(column: string, value: unknown) {
        recorded.filters.push({op: 'eq', column, value});
        return builder;
      },
      is(column: string, value: unknown) {
        recorded.filters.push({op: 'is', column, value});
        return builder;
      },
      lt(column: string, value: unknown) {
        recorded.filters.push({op: 'lt', column, value});
        return builder;
      },
      insert() {
        writes.push(`insert:${table}`);
        return builder;
      },
      update() {
        writes.push(`update:${table}`);
        return builder;
      },
      delete() {
        writes.push(`delete:${table}`);
        return builder;
      },
      then<T>(onFulfilled: (value: ReturnType<typeof execute>) => T) {
        return Promise.resolve(onFulfilled(execute()));
      },
    };
    return builder;
  }

  /** Fonte anterior do alerta: só `company_id`, sem filial/veículo. */
  async function rpc(fn: string, args: Row) {
    rpcCalls.push({fn, args});
    if (fn !== 'get_maintenance_stats') return {data: null, error: null};
    const overdue = (tables.maintenance_schedules ?? []).filter(
      (row) =>
        row.company_id === args.p_company_id &&
        row.deleted_at == null &&
        row.is_active === true &&
        row.next_due_at != null &&
        Date.parse(String(row.next_due_at)) < Date.now(),
    ).length;
    return {data: {overdue_schedules: overdue}, error: null};
  }

  return {client: {from, rpc} as never, queries, rpcCalls, writes};
}

function makeDre(): OperationalDreData {
  return {
    filters: {},
    costsOnlyMode: false,
    revenues: {freightRevenue: 1000, totalRevenue: 1000},
    costs: {
      fuel: 100,
      maintenance: 50,
      tires: 0,
      financial: 0,
      accountsPayable: 0,
      other: 250,
      totalOperatingCosts: 400,
      allocatedOperatingCosts: 400,
      unattributableOperatingCosts: 0,
    },
    result: {operatingProfit: 600, operatingMarginPercent: 60},
    indicators: {
      totalKm: 500,
      tripCount: 4,
      customersServed: 0,
      routesUsed: 0,
      vehiclesUsed: 0,
      revenuePerKm: null,
      costPerKm: null,
      profitPerKm: null,
      revenuePerTrip: null,
      costPerTrip: null,
      profitPerTrip: null,
    },
    analyticalTable: [],
    costCenterBreakdown: {byCode: {}, ranking: [], total: 0},
  };
}

function makeFinancial(
  proximosVencimentos: FinancialDashboardData['proximosVencimentos'] = [],
): FinancialDashboardData {
  return {
    summary: {
      entradasRecebidas: 0,
      saidasPagas: 0,
      saldoAtual: 0,
      aReceber: 300,
      aPagar: 200,
      saldoProjetado: 0,
    },
    contasAPagar: {total: 200, quantidade: 1},
    contasAReceber: {total: 300, quantidade: 1},
    recebimentos: {mes: 0, hoje: 0},
    pagamentos: {mes: 0, hoje: 0},
    inadimplencia: {aReceber: 0, aPagar: 0},
    proximosVencimentos,
    resumo: {totalRecebido: 0, totalPago: 0, resultado: 0},
  };
}

const CURRENT_PERIOD: OperationalDreFilters = {
  dateFrom: '2026-10-01',
  dateTo: '2026-10-31',
};

async function loadOverdue(
  fake: ReturnType<typeof createFakeSupabase>,
  filters: OperationalDreFilters = {},
  companyId = COMPANY_A,
): Promise<number> {
  const core = await getExecutiveDashboardCore(fake.client, companyId, {
    ...CURRENT_PERIOD,
    ...filters,
  });
  return core.maintenance.overdueSchedules;
}

async function loadAlerts(
  fake: ReturnType<typeof createFakeSupabase>,
  filters: OperationalDreFilters = {},
) {
  const core = await getExecutiveDashboardCore(fake.client, COMPANY_A, {
    ...CURRENT_PERIOD,
    ...filters,
  });
  const secondary = await getExecutiveDashboardSecondary(fake.client, COMPANY_A, core);
  return {core, alerts: secondary.alerts};
}

function maintenanceAlert(alerts: Array<{id: string; title: string}>) {
  return alerts.find((alert) => alert.id === 'manutencao-atrasada');
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW));
  getOperationalDreBundle.mockReset();
  getFinancialDashboardData.mockReset();
  listRoutesWithoutLeadTime.mockReset();
  getOperationalDreBundle.mockResolvedValue({
    dre: makeDre(),
    byRoute: {groups: [], filters: {}},
    byCustomer: [],
  });
  getFinancialDashboardData.mockResolvedValue(makeFinancial());
  listRoutesWithoutLeadTime.mockResolvedValue([]);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Audit #22 — escopo de filial', () => {
  it('sem filtro de filial: alertas vencidos ativos da empresa aparecem normalmente', async () => {
    const fake = createFakeSupabase(seedTables());
    // s1, s2, s3, s4 (inclui veículo sem filial)
    expect(await loadOverdue(fake)).toBe(4);

    const {alerts} = await loadAlerts(fake);
    expect(maintenanceAlert(alerts)?.title).toBe('4 veículos com manutenção atrasada');
  });

  it('com filtro de filial: somente agendamentos daquela filial', async () => {
    const fake = createFakeSupabase(seedTables());
    // s1, s2 — não inclui s3 (filial 2), s4 (sem filial) nem s8 (veículo excluído)
    expect(await loadOverdue(fake, {branchId: BRANCH_1})).toBe(2);

    const {alerts} = await loadAlerts(fake, {branchId: BRANCH_1});
    expect(maintenanceAlert(alerts)?.title).toBe('2 veículos com manutenção atrasada');
  });

  it('com outra filial: alertas da filial 1 não vazam', async () => {
    const fake = createFakeSupabase(seedTables());
    expect(await loadOverdue(fake, {branchId: BRANCH_2})).toBe(1);

    const {alerts} = await loadAlerts(fake, {branchId: BRANCH_2});
    expect(maintenanceAlert(alerts)?.title).toBe('1 veículo com manutenção atrasada');
  });

  it('filial sem agendamentos vencidos: nenhum alerta de manutenção', async () => {
    const fake = createFakeSupabase(seedTables());
    const {alerts} = await loadAlerts(fake, {branchId: 'branch-sem-dados'});
    expect(maintenanceAlert(alerts)).toBeUndefined();
  });

  it('usa branch_id explícito do agendamento (não infere filial pelo veículo)', async () => {
    const tables = seedTables();
    // Veículo da filial 1, mas agendamento explicitamente da filial 2.
    tables.maintenance_schedules!.push(
      schedule('s11-explicit-b2', {branch_id: BRANCH_2, vehicle_id: VEHICLE_1}),
    );
    const fake = createFakeSupabase(tables);
    expect(await loadOverdue(fake, {branchId: BRANCH_2})).toBe(2);
    expect(await loadOverdue(fake, {branchId: BRANCH_1})).toBe(2);
  });
});

describe('Audit #22 — veículo e motorista', () => {
  it('filtro de veículo: somente agendamentos do veículo selecionado', async () => {
    const fake = createFakeSupabase(seedTables());
    expect(await loadOverdue(fake, {vehicleId: VEHICLE_2})).toBe(1);
    expect(await loadOverdue(fake, {vehicleId: VEHICLE_1})).toBe(2);
    expect(await loadOverdue(fake, {vehicleId: VEHICLE_3})).toBe(1);
  });

  it('filial + veículo combinados (AND)', async () => {
    const fake = createFakeSupabase(seedTables());
    expect(await loadOverdue(fake, {branchId: BRANCH_2, vehicleId: VEHICLE_1})).toBe(0);
    expect(await loadOverdue(fake, {branchId: BRANCH_1, vehicleId: VEHICLE_1})).toBe(2);
  });

  it('filtro de motorista usa driver_id explícito do agendamento', async () => {
    const fake = createFakeSupabase(seedTables());
    expect(await loadOverdue(fake, {driverId: DRIVER_1})).toBe(1);
    expect(await loadOverdue(fake, {driverId: 'driver-sem-agendamento'})).toBe(0);
  });

  it.each([
    ['cliente', {customerId: 'customer-1'}],
    ['rota', {routeId: 'route-1'}],
    ['centro de custo', {costCenterId: 'cc-1'}],
  ] as const)(
    'dimensão sem vínculo em maintenance_schedules (%s): alerta fora do escopo, sem query',
    async (_label, filters) => {
      const fake = createFakeSupabase(seedTables());
      const {alerts} = await loadAlerts(fake, filters);
      expect(maintenanceAlert(alerts)).toBeUndefined();
      expect(fake.queries.filter((q) => q.table === 'maintenance_schedules')).toHaveLength(0);
    },
  );
});

describe('Audit #22 — período (alerta operacional de estado atual)', () => {
  it('período histórico não remove manutenção vencida hoje', async () => {
    const fake = createFakeSupabase(seedTables());
    const historical = await getExecutiveDashboardCore(fake.client, COMPANY_A, {
      dateFrom: '2025-01-01',
      dateTo: '2025-01-31',
    });
    const current = await getExecutiveDashboardCore(fake.client, COMPANY_A, CURRENT_PERIOD);
    expect(historical.maintenance.overdueSchedules).toBe(4);
    expect(current.maintenance.overdueSchedules).toBe(4);
  });

  it('vencimento futuro dentro do período não conta; vencido antes do período conta', async () => {
    const fake = createFakeSupabase(seedTables());
    // s5 vence em 2026-10-20 (dentro do período, ainda não venceu) → fora.
    // s2 venceu em 2025-12-01 (antes do período) → dentro.
    expect(await loadOverdue(fake, {branchId: BRANCH_1})).toBe(2);
  });

  it('datas do período não viram predicado de data na query', async () => {
    const fake = createFakeSupabase(seedTables());
    await loadOverdue(fake);
    const [query] = fake.queries.filter((q) => q.table === 'maintenance_schedules');
    const dateFilters = query!.filters.filter((f) => f.column === 'next_due_at');
    expect(dateFilters).toEqual([{op: 'lt', column: 'next_due_at', value: NOW}]);
  });
});

describe('Audit #22 — company_id', () => {
  it('agendamento de outra empresa nunca aparece', async () => {
    const fake = createFakeSupabase(seedTables());
    expect(await loadOverdue(fake, {branchId: BRANCH_B})).toBe(0);
    expect(await loadOverdue(fake, {vehicleId: VEHICLE_B})).toBe(0);
    expect(await loadOverdue(fake, {}, COMPANY_B)).toBe(1);

    const [query] = fake.queries.filter((q) => q.table === 'maintenance_schedules');
    expect(query!.filters).toContainEqual({op: 'eq', column: 'company_id', value: COMPANY_A});
  });
});

describe('Audit #22 — soft-delete', () => {
  it('agendamento excluído, inativo, sem vencimento ou de veículo excluído não conta', async () => {
    const tables = seedTables();
    const onlyExcluded = tables.maintenance_schedules!.filter((row) =>
      ['s6-deleted', 's7-inactive', 's8-vehicle-deleted', 's10-no-due'].includes(
        String(row.id),
      ),
    );
    const fake = createFakeSupabase({...tables, maintenance_schedules: onlyExcluded});
    expect(await loadOverdue(fake)).toBe(0);

    const {alerts} = await loadAlerts(fake);
    expect(maintenanceAlert(alerts)).toBeUndefined();
  });

  it('não altera nem apaga histórico (nenhuma escrita; tabelas intactas)', async () => {
    const tables = seedTables();
    const snapshot = structuredClone(tables);
    const fake = createFakeSupabase(tables);

    await loadAlerts(fake, {branchId: BRANCH_1});

    expect(fake.writes).toEqual([]);
    expect(tables).toEqual(snapshot);
    expect(fake.queries.some((q) => q.table === 'maintenance_records')).toBe(false);
  });
});

describe('Audit #22 — estado atual', () => {
  it('detecta vencida com base no instante atual (next_due_at < agora)', async () => {
    const fake = createFakeSupabase(seedTables());
    expect(await loadOverdue(fake, {branchId: BRANCH_1})).toBe(2);

    vi.setSystemTime(new Date('2026-10-25T12:00:00.000Z'));
    // s5 (2026-10-20) passa a estar vencida.
    expect(await loadOverdue(fake, {branchId: BRANCH_1})).toBe(3);
  });

  it('vencimento exatamente agora ainda não é atraso (comparação estrita)', async () => {
    const fake = createFakeSupabase({
      ...seedTables(),
      maintenance_schedules: [schedule('s-now', {next_due_at: NOW})],
    });
    expect(await loadOverdue(fake)).toBe(0);
  });
});

describe('Audit #22 — empty state', () => {
  it('sem agendamentos: contagem 0 e nenhum alerta de manutenção, sem erro', async () => {
    const fake = createFakeSupabase({...seedTables(), maintenance_schedules: []});
    const {core, alerts} = await loadAlerts(fake, {branchId: BRANCH_1});
    expect(core.maintenance).toEqual({overdueSchedules: 0});
    expect(maintenanceAlert(alerts)).toBeUndefined();
  });

  it('count nulo do PostgREST vira 0', async () => {
    const client = {
      from: () => {
        const builder = {
          select: () => builder,
          eq: () => builder,
          is: () => builder,
          lt: () => builder,
          then: <T>(resolve: (v: unknown) => T) =>
            Promise.resolve(resolve({data: null, count: null, error: null})),
        };
        return builder;
      },
    } as never;
    expect(await countOverdueMaintenanceSchedules(client, COMPANY_A)).toBe(0);
  });

  it('erro do banco é propagado como erro mapeado', async () => {
    const client = {
      from: () => {
        const builder = {
          select: () => builder,
          eq: () => builder,
          is: () => builder,
          lt: () => builder,
          then: <T>(resolve: (v: unknown) => T) =>
            Promise.resolve(
              resolve({data: null, count: null, error: {message: 'boom', code: 'XX000'}}),
            ),
        };
        return builder;
      },
    } as never;
    await expect(countOverdueMaintenanceSchedules(client, COMPANY_A)).rejects.toThrow();
  });
});

describe('Audit #22 — regressão', () => {
  it('KPIs executivos e chamadas DRE/financeiro inalterados', async () => {
    const fake = createFakeSupabase(seedTables());
    const filters: OperationalDreFilters = {
      ...CURRENT_PERIOD,
      branchId: BRANCH_1,
      vehicleId: VEHICLE_1,
    };
    const core = await getExecutiveDashboardCore(fake.client, COMPANY_A, filters);

    expect(core.kpis).toEqual(buildExecutiveDashboardKpis(makeDre(), makeFinancial()));
    expect(getOperationalDreBundle).toHaveBeenCalledWith(fake.client, COMPANY_A, filters);
    expect(getFinancialDashboardData).toHaveBeenCalledWith(fake.client, COMPANY_A);
    expect(getFinancialDashboardData.mock.calls[0]).toHaveLength(2);
    expect(core.period).toEqual(filters);
  });

  it('outros alertas continuam funcionando junto com o de manutenção', async () => {
    const today = toIsoDate(new Date());
    getFinancialDashboardData.mockResolvedValue(
      makeFinancial([
        {
          id: 'ap-1',
          description: 'Conta',
          amount: 10,
          dueDate: today,
          type: 'payable',
        } as unknown as FinancialDashboardData['proximosVencimentos'][number],
      ]),
    );
    listRoutesWithoutLeadTime.mockResolvedValue([{id: 'route-x'}]);
    const fake = createFakeSupabase(seedTables());

    const {alerts} = await loadAlerts(fake, {branchId: BRANCH_2});
    const ids = alerts.map((alert) => alert.id);
    expect(ids).toContain('rotas-sem-lead-time');
    expect(ids).toContain('contas-vencem-hoje');
    expect(maintenanceAlert(alerts)?.title).toBe('1 veículo com manutenção atrasada');
  });
});

describe('Audit #22 — performance', () => {
  it('uma única query HEAD/count com filtros no banco; sem RPC company-wide; sem N+1', async () => {
    const fake = createFakeSupabase(seedTables());
    await loadAlerts(fake, {branchId: BRANCH_1, vehicleId: VEHICLE_1, driverId: DRIVER_1});

    const scheduleQueries = fake.queries.filter((q) => q.table === 'maintenance_schedules');
    expect(scheduleQueries).toHaveLength(1);
    expect(fake.queries).toHaveLength(1);
    expect(fake.rpcCalls).toEqual([]);

    const [query] = scheduleQueries;
    expect(query!.options).toEqual({count: 'exact', head: true});
    expect(query!.columns).toContain('vehicles!inner');
    expect(query!.filters).toEqual(
      expect.arrayContaining([
        {op: 'eq', column: 'company_id', value: COMPANY_A},
        {op: 'is', column: 'deleted_at', value: null},
        {op: 'eq', column: 'is_active', value: true},
        {op: 'is', column: 'vehicles.deleted_at', value: null},
        {op: 'lt', column: 'next_due_at', value: NOW},
        {op: 'eq', column: 'branch_id', value: BRANCH_1},
        {op: 'eq', column: 'vehicle_id', value: VEHICLE_1},
        {op: 'eq', column: 'driver_id', value: DRIVER_1},
      ]),
    );
  });
});
