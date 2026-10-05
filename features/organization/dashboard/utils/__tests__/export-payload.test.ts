/**
 * Audit #24 — exportação própria do Dashboard Executivo.
 * O payload é montado a partir do `getExecutiveDashboardCore` real (DRE e
 * financeiro mockados), no escopo dos filtros da tela.
 */
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import * as XLSX from 'xlsx';

import {
  ANALYTICS_XLSX_MIME_TYPE,
  exportAnalyticsExcel,
} from '@/features/analytics-nav/utils/export-analytics';
import type {
  OperationalDreData,
  OperationalDreFilterOptions,
  OperationalDreFilters,
  OperationalDreRouteGroup,
} from '@/features/dre/types';
import type {FinancialDashboardData} from '@/features/financial-dashboard/types';

import {getExecutiveDashboardCore} from '../../loaders/executive-dashboard-loader';
import {
  buildExecutiveDashboardExportPayload,
  executiveDashboardExportFilenameBase,
} from '../export-payload';

const getOperationalDreBundle = vi.hoisted(() => vi.fn());
const getFinancialDashboardData = vi.hoisted(() => vi.fn());
const countOverdueMaintenanceSchedules = vi.hoisted(() => vi.fn());

vi.mock('@/features/dre/loaders', () => ({getOperationalDreBundle}));
vi.mock('@/features/financial-dashboard/queries', () => ({getFinancialDashboardData}));
vi.mock('@/features/maintenance/queries', () => ({countOverdueMaintenanceSchedules}));
vi.mock('@/features/cadastro-quality/queries', () => ({
  listRoutesWithoutLeadTime: vi.fn(async () => []),
}));

const FILTERS: OperationalDreFilters = {
  dateFrom: '2026-09-01',
  dateTo: '2026-09-30',
  branchId: 'branch-1',
  customerId: 'customer-1',
};

const OPTIONS: OperationalDreFilterOptions = {
  branches: [{id: 'branch-1', name: 'Matriz', code: 'MTZ'}],
  customers: [{id: 'customer-1', name: 'Mateus'}],
  routes: [],
  vehicles: [],
  drivers: [],
  costCenters: [],
};

function makeDre(input: {
  revenue: number;
  costs: number;
  trips: number;
  km: number;
  costsOnlyMode?: boolean;
}): OperationalDreData {
  const costsOnlyMode = input.costsOnlyMode ?? false;
  const profit = costsOnlyMode ? null : input.revenue - input.costs;
  return {
    filters: {},
    costsOnlyMode,
    revenues: {freightRevenue: input.revenue, totalRevenue: input.revenue},
    costs: {
      fuel: 0,
      maintenance: 0,
      tires: 0,
      financial: 0,
      accountsPayable: 0,
      other: input.costs,
      totalOperatingCosts: input.costs,
      allocatedOperatingCosts: input.costs,
      unattributableOperatingCosts: 0,
    },
    result: {
      operatingProfit: profit,
      operatingMarginPercent:
        profit == null || input.revenue <= 0 ? null : (profit / input.revenue) * 100,
    },
    indicators: {
      totalKm: input.km,
      tripCount: input.trips,
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

function routeGroup(
  id: string | null,
  label: string,
  revenue: number,
  profit: number | null,
): OperationalDreRouteGroup {
  return {
    dimensionKey: id ?? '__none__',
    dimensionType: 'route',
    route: {id, label},
    label,
    tripCount: 1,
    totalRevenue: revenue,
    totalCost: profit == null ? revenue : revenue - profit,
    totalProfit: profit,
    marginPercent: profit == null || revenue <= 0 ? null : (profit / revenue) * 100,
    totalKm: 100,
    costPerKm: null,
    revenuePerKm: null,
    trips: [],
  };
}

function makeFinancial(ap: number, ar: number): FinancialDashboardData {
  return {
    summary: {
      entradasRecebidas: 0,
      saidasPagas: 0,
      saldoAtual: 0,
      aReceber: ar,
      aPagar: ap,
      saldoProjetado: 0,
    },
    contasAPagar: {total: ap, quantidade: 1},
    contasAReceber: {total: ar, quantidade: 1},
    recebimentos: {mes: 0, hoje: 0},
    pagamentos: {mes: 0, hoje: 0},
    inadimplencia: {aReceber: 0, aPagar: 0},
    proximosVencimentos: [],
    resumo: {totalRecebido: 0, totalPago: 0, resultado: 0},
  };
}

function mockBundle(dre: OperationalDreData) {
  getOperationalDreBundle.mockResolvedValue({
    dre,
    byRoute: {
      groups: [
        routeGroup('route-b', 'Rota B', 1000, 100),
        routeGroup('route-a', 'Rota A', 3000, 1200),
        routeGroup(null, 'Sem rota', 9000, 9000),
      ],
      filters: {},
    },
    byCustomer: [
      {
        ...routeGroup('customer-1', 'Mateus', 4000, 1300),
        dimensionType: 'customer',
        customer: {id: 'customer-1', label: 'Mateus'},
      },
    ],
  });
}

async function loadPayload(filters: OperationalDreFilters = FILTERS) {
  const core = await getExecutiveDashboardCore({} as never, 'company-1', filters);
  return {core, payload: buildExecutiveDashboardExportPayload({core, filterOptions: OPTIONS})};
}

function kpi(payload: {kpis?: Array<{label: string; value: string}>}, label: string) {
  return payload.kpis?.find((item) => item.label.startsWith(label))?.value?.replace(/\u00a0/g, ' ');
}

beforeEach(() => {
  getOperationalDreBundle.mockReset();
  getFinancialDashboardData.mockReset();
  countOverdueMaintenanceSchedules.mockReset();
  mockBundle(makeDre({revenue: 4000, costs: 2700, trips: 2, km: 250.5}));
  getFinancialDashboardData.mockResolvedValue(makeFinancial(777, 888));
  countOverdueMaintenanceSchedules.mockResolvedValue(0);
});

describe('Audit #24 — payload do Executivo espelha o loader', () => {
  it('KPIs iguais aos cards da tela (DRE filtrada + AP/AR company-wide)', async () => {
    const {payload} = await loadPayload();
    expect(payload.title).toBe('Dashboard Executivo');
    expect(kpi(payload, 'Receita Total')).toBe('R$ 4.000,00');
    expect(kpi(payload, 'Custos Totais')).toBe('R$ 2.700,00');
    expect(kpi(payload, 'Lucro Operacional')).toBe('R$ 1.300,00');
    expect(kpi(payload, 'Margem Operacional')).toBe('32,5%');
    expect(kpi(payload, 'KM Rodados')).toBe('250,5 km');
    expect(kpi(payload, 'Viagens Concluídas')).toBe('2');
    expect(kpi(payload, 'Saldo em aberto — Contas a Pagar')).toBe('R$ 777,00');
    expect(kpi(payload, 'Saldo em aberto — Contas a Receber')).toBe('R$ 888,00');
    expect(
      payload.kpis?.find((item) => item.label.startsWith('Saldo em aberto — Contas a Pagar'))
        ?.label,
    ).toContain('Empresa inteira');
  });

  it('Top 5 Rotas e Top 5 Clientes = core.topRoutes / core.topCustomers', async () => {
    const {core, payload} = await loadPayload();
    expect(payload.tableTitle).toBe('Top 5 Rotas');
    expect(payload.rows).toEqual(
      core.topRoutes.map((route, index) => ({
        position: index + 1,
        name: route.name,
        revenue: route.revenue,
        profit: route.profit,
        margin: route.marginPercent,
        status: expect.any(String),
      })),
    );
    // Ordem por lucro e sem "Sem rota", como no card.
    expect(payload.rows.map((row) => row.name)).toEqual(['Rota A', 'Rota B']);

    const customers = payload.sections?.find((s) => s.title === 'Top 5 Clientes');
    expect(customers?.rows).toEqual([
      {position: 1, name: 'Mateus', revenue: 4000, profit: 1300},
    ]);
  });

  it('modo só custos: receita/lucro/margem "—", custos e AP/AR preservados', async () => {
    mockBundle(makeDre({revenue: 0, costs: 500, trips: 0, km: 0, costsOnlyMode: true}));
    const {payload} = await loadPayload({...FILTERS, costCenterId: 'cc-1'});
    expect(kpi(payload, 'Receita Total')).toBe('—');
    expect(kpi(payload, 'Lucro Operacional')).toBe('—');
    expect(kpi(payload, 'Margem Operacional')).toBe('—');
    expect(kpi(payload, 'Custos Totais')).toBe('R$ 500,00');
    expect(kpi(payload, 'Saldo em aberto — Contas a Pagar')).toBe('R$ 777,00');
  });

  it('sem dados no período: KPIs operacionais "—" e rankings vazios sem erro', async () => {
    getOperationalDreBundle.mockResolvedValue({
      dre: makeDre({revenue: 0, costs: 0, trips: 0, km: 0}),
      byRoute: {groups: [], filters: {}},
      byCustomer: [],
    });
    const {payload} = await loadPayload();
    expect(kpi(payload, 'Receita Total')).toBe('—');
    expect(kpi(payload, 'Custos Totais')).toBe('—');
    expect(kpi(payload, 'KM Rodados')).toBe('—');
    expect(kpi(payload, 'Viagens Concluídas')).toBe('—');
    expect(payload.rows).toEqual([]);
    expect(payload.sections?.[0]?.rows).toEqual([]);
  });
});

describe('Audit #24 — escopo dos filtros', () => {
  it('filtros chegam ao loader e aparecem no arquivo', async () => {
    const {payload} = await loadPayload();
    expect(getOperationalDreBundle).toHaveBeenCalledWith(
      expect.anything(),
      'company-1',
      expect.objectContaining(FILTERS),
    );
    expect(kpi(payload, 'Período')).toBe('01/09/2026 – 30/09/2026');
    expect(kpi(payload, 'Filtros')).toBe('Filial: Matriz · Cliente: Mateus');
  });

  it('sem filtros de entidade: "Nenhum"', async () => {
    const {payload} = await loadPayload({dateFrom: '2026-09-01', dateTo: '2026-09-30'});
    expect(kpi(payload, 'Filtros')).toBe('Nenhum');
  });

  it('falha ao carregar opções de filtro não rotula o escopo como "Nenhum"', async () => {
    const core = await getExecutiveDashboardCore({} as never, 'company-1', FILTERS);
    const payload = buildExecutiveDashboardExportPayload({
      core,
      filterOptions: {
        branches: [],
        customers: [],
        routes: [],
        vehicles: [],
        drivers: [],
        costCenters: [],
      },
    });
    expect(kpi(payload, 'Filtros')).toBe('Filtros aplicados');
  });

  it('nome do arquivo inclui o período do core', async () => {
    const {core} = await loadPayload();
    expect(executiveDashboardExportFilenameBase(core.period)).toBe(
      'dashboard-executivo_2026-09-01_2026-09-30',
    );
  });

  it('a página usa core.period e o payload do core', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'app/(dashboard)/dashboard/page.tsx'),
      'utf8',
    );
    expect(source).toContain('<AnalyticsExportToolbar');
    expect(source).toContain('filters={core.period}');
    expect(source).toContain('basePath={ROUTES.dashboard}');
    expect(source).toContain(
      'filenameBase={executiveDashboardExportFilenameBase(core.period)}',
    );
    expect(source).toContain(
      'payload={buildExecutiveDashboardExportPayload({core, filterOptions})}',
    );
  });
});

describe('Audit #24 — arquivo XLSX do Executivo', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('baixa .xlsx com MIME OOXML contendo KPIs e rankings', async () => {
    const {core, payload} = await loadPayload();
    const anchor = {href: '', download: '', click: vi.fn()};
    vi.stubGlobal('document', {createElement: vi.fn(() => anchor)});
    let blob: Blob | undefined;
    vi.spyOn(URL, 'createObjectURL').mockImplementation((value) => {
      blob = value as Blob;
      return 'blob:exec';
    });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    await exportAnalyticsExcel(payload, executiveDashboardExportFilenameBase(core.period));

    expect(anchor.download).toBe('dashboard-executivo_2026-09-01_2026-09-30.xlsx');
    expect(blob!.type).toBe(ANALYTICS_XLSX_MIME_TYPE);

    const workbook = XLSX.read(new Uint8Array(await blob!.arrayBuffer()), {type: 'array'});
    expect(workbook.SheetNames).toEqual(['Dashboard Executivo']);
    const flat = XLSX.utils
      .sheet_to_json<unknown[]>(workbook.Sheets['Dashboard Executivo']!, {
        header: 1,
        defval: null,
      })
      .map((row) => row.filter((cell) => cell != null));

    expect(flat).toContainEqual(['Top 5 Rotas']);
    expect(flat).toContainEqual([1, 'Rota A', 3000, 1200, 40, expect.any(String)]);
    expect(flat).toContainEqual(['Top 5 Clientes']);
    expect(flat).toContainEqual([1, 'Mateus', 4000, 1300]);
  });
});
