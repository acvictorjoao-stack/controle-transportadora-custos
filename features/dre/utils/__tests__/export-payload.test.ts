/**
 * Audit #24 — exportação própria da DRE Operacional.
 * O payload deve espelhar `OperationalDreData`/`byRoute` do loader da tela,
 * no escopo dos filtros, e gerar arquivo XLSX real.
 */
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {afterEach, describe, expect, it, vi} from 'vitest';
import * as XLSX from 'xlsx';

import {
  ANALYTICS_XLSX_MIME_TYPE,
  exportAnalyticsExcel,
} from '@/features/analytics-nav/utils/export-analytics';

import {buildAnalyticalTable} from '../../services/operational-dre-calculator';
import type {
  OperationalDreByRouteData,
  OperationalDreCosts,
  OperationalDreData,
  OperationalDreFilterOptions,
  OperationalDreFilters,
} from '../../types';
import {
  buildOperationalDreExportPayload,
  operationalDreExportFilenameBase,
} from '../export-payload';

const FILTERS: OperationalDreFilters = {
  branchId: 'branch-1',
  vehicleId: 'vehicle-1',
  dateFrom: '2026-09-01',
  dateTo: '2026-09-30',
};

const OPTIONS: OperationalDreFilterOptions = {
  branches: [
    {id: 'branch-1', name: 'Matriz', code: 'MTZ'},
    {id: 'branch-2', name: 'Filial Sul', code: 'SUL'},
  ],
  customers: [],
  routes: [],
  vehicles: [{id: 'vehicle-1', label: 'ABC-1234'}],
  drivers: [],
  costCenters: [{id: 'cc-1', name: 'Operacional', code: 'OPER'}],
};

const COSTS: OperationalDreCosts = {
  fuel: 1200,
  maintenance: 300.5,
  tires: 0,
  financial: 50,
  accountsPayable: 100,
  other: 349.5,
  totalOperatingCosts: 2000,
  allocatedOperatingCosts: 1800,
  unattributableOperatingCosts: 200,
};

function makeDre(costsOnlyMode = false): OperationalDreData {
  const totalRevenue = costsOnlyMode ? 0 : 5000;
  const operatingProfit = costsOnlyMode ? null : 3000;
  return {
    filters: costsOnlyMode ? {...FILTERS, costCenterId: 'cc-1'} : FILTERS,
    costsOnlyMode,
    revenues: {freightRevenue: totalRevenue, totalRevenue},
    costs: COSTS,
    result: {
      operatingProfit,
      operatingMarginPercent: costsOnlyMode ? null : 60,
    },
    indicators: {
      revenuePerKm: costsOnlyMode ? null : 5,
      costPerKm: 2,
      profitPerKm: costsOnlyMode ? null : 3,
      revenuePerTrip: costsOnlyMode ? null : 1250,
      costPerTrip: 500,
      profitPerTrip: costsOnlyMode ? null : 750,
      tripCount: 4,
      totalKm: 1000,
      customersServed: 2,
      routesUsed: 2,
      vehiclesUsed: 1,
    },
    analyticalTable: buildAnalyticalTable(totalRevenue, COSTS, operatingProfit, costsOnlyMode),
    costCenterBreakdown: {
      byCode: {OPER: 1500, RH: 500},
      ranking: [
        {costCenterId: 'cc-1', code: 'OPER', name: 'Operacional', value: 1500, percent: 75},
        {costCenterId: null, code: 'RH', name: 'Recursos Humanos', value: 500, percent: 25},
      ],
      total: 2000,
    },
  };
}

function makeByRoute(costsOnlyMode = false): OperationalDreByRouteData {
  return {
    filters: FILTERS,
    groups: [
      {
        dimensionKey: 'route-1',
        dimensionType: 'route',
        route: {id: 'route-1', label: 'SLZ → IMP'},
        label: 'SLZ → IMP',
        tripCount: 3,
        totalRevenue: costsOnlyMode ? 0 : 4000,
        totalCost: 1500,
        totalProfit: costsOnlyMode ? null : 2500,
        marginPercent: costsOnlyMode ? null : 62.5,
        totalKm: 800,
        costPerKm: 1.875,
        revenuePerKm: costsOnlyMode ? null : 5,
        trips: [],
      },
      {
        dimensionKey: '__none__',
        dimensionType: 'route',
        route: {id: null, label: 'Sem rota'},
        label: 'Sem rota',
        tripCount: 1,
        totalRevenue: costsOnlyMode ? 0 : 1000,
        totalCost: 300,
        totalProfit: costsOnlyMode ? null : 700,
        marginPercent: costsOnlyMode ? null : 70,
        totalKm: 200,
        costPerKm: 1.5,
        revenuePerKm: costsOnlyMode ? null : 5,
        trips: [],
      },
    ],
  };
}

function build(costsOnlyMode = false, filters = FILTERS) {
  return buildOperationalDreExportPayload({
    data: makeDre(costsOnlyMode),
    byRoute: makeByRoute(costsOnlyMode),
    filters,
    filterOptions: OPTIONS,
  });
}

function kpi(payload: ReturnType<typeof build>, label: string) {
  return payload.kpis?.find((item) => item.label === label)?.value;
}

function section(payload: ReturnType<typeof build>, title: string) {
  return payload.sections?.find((item) => item.title === title);
}

const nbsp = (value: string | undefined) => value?.replace(/\u00a0/g, ' ');

describe('Audit #24 — payload da DRE espelha os dados do loader', () => {
  it('KPIs dos cards (receitas, custos atribuídos/não atribuíveis, resultado)', () => {
    const payload = build();
    expect(payload.title).toBe('DRE Operacional');
    expect(nbsp(kpi(payload, 'Receita de Fretes'))).toBe('R$ 5.000,00');
    expect(nbsp(kpi(payload, 'Receita Total'))).toBe('R$ 5.000,00');
    expect(nbsp(kpi(payload, 'Custos atribuídos'))).toBe('R$ 1.800,00');
    expect(nbsp(kpi(payload, 'Não atribuíveis'))).toBe('R$ 200,00');
    expect(nbsp(kpi(payload, 'Total de Custos'))).toBe('R$ 2.000,00');
    expect(nbsp(kpi(payload, 'Lucro Operacional'))).toBe('R$ 3.000,00');
    expect(kpi(payload, 'Margem Operacional')).toBe('60,0%');
  });

  it('tabela analítica = analyticalTable do loader (valores e % receita)', () => {
    const data = makeDre();
    const payload = build();
    expect(payload.tableTitle).toBe('Tabela Analítica');
    expect(payload.columns.map((col) => col.header)).toEqual([
      'Categoria',
      'Valor',
      '% Receita',
    ]);
    expect(payload.rows).toEqual(
      data.analyticalTable.map((row) => ({
        category: row.label,
        value: row.value,
        percentOfRevenue: row.percentOfRevenue,
      })),
    );
    // Totais consistentes: soma das categorias de custo = total da DRE.
    const costTotal = payload.rows
      .filter((row) => !['Receita', 'Lucro'].some((l) => String(row.category).startsWith(l)))
      .reduce((sum, row) => sum + Number(row.value), 0);
    expect(costTotal).toBeCloseTo(COSTS.totalOperatingCosts, 6);
  });

  it('seções: indicadores, centros de custo e custos por rota', () => {
    const payload = build();

    expect(section(payload, 'Indicadores')?.rows).toEqual(
      expect.arrayContaining([
        {indicator: 'Receita/km', value: 5},
        {indicator: 'Custo/km', value: 2},
        {indicator: 'Viagens', value: 4},
        {indicator: 'KM Rodados', value: 1000},
        {indicator: 'Veículos Utilizados', value: 1},
      ]),
    );
    expect(section(payload, 'Indicadores')?.rows).toHaveLength(11);

    expect(section(payload, 'Ranking — Centros de Custo')?.rows).toEqual([
      {center: 'OPER — Operacional', value: 1500, percent: 75},
      {center: 'RH — Recursos Humanos', value: 500, percent: 25},
    ]);

    expect(section(payload, 'Custos por Rota')?.rows).toEqual([
      {
        route: 'SLZ → IMP',
        tripCount: 3,
        revenue: 4000,
        cost: 1500,
        profit: 2500,
        margin: 62.5,
        costPerKm: 1.875,
        revenuePerKm: 5,
      },
      {
        route: 'Sem rota',
        tripCount: 1,
        revenue: 1000,
        cost: 300,
        profit: 700,
        margin: 70,
        costPerKm: 1.5,
        revenuePerKm: 5,
      },
    ]);
  });

  it('modo só custos (Audit #6): receita/lucro/margem como "—", custos preservados', () => {
    const payload = build(true, {...FILTERS, costCenterId: 'cc-1'});
    expect(kpi(payload, 'Receita Total')).toBe('—');
    expect(kpi(payload, 'Receita de Fretes')).toBe('—');
    expect(kpi(payload, 'Lucro Operacional')).toBe('—');
    expect(kpi(payload, 'Margem Operacional')).toBe('—');
    expect(nbsp(kpi(payload, 'Total de Custos'))).toBe('R$ 2.000,00');

    expect(payload.rows.map((row) => row.category)).not.toContain('Receita');
    expect(payload.rows.every((row) => row.percentOfRevenue === '—')).toBe(true);

    const [route] = section(payload, 'Custos por Rota')!.rows;
    expect(route).toMatchObject({revenue: '—', cost: 1500, profit: '—', margin: '—'});
    expect(section(payload, 'Indicadores')?.rows).toContainEqual({
      indicator: 'Receita/km',
      value: '—',
    });
  });

  it('sem dados: tabelas vazias sem erro', () => {
    const payload = buildOperationalDreExportPayload({
      data: {
        ...makeDre(),
        analyticalTable: [],
        costCenterBreakdown: {byCode: {}, ranking: [], total: 0},
      },
      byRoute: {groups: [], filters: {}},
      filters: {},
      filterOptions: OPTIONS,
    });
    expect(payload.rows).toEqual([]);
    expect(section(payload, 'Custos por Rota')?.rows).toEqual([]);
    expect(kpi(payload, 'Período')).toBe('Todo o período');
    expect(kpi(payload, 'Filtros')).toBe('Nenhum');
  });
});

describe('Audit #24 — escopo dos filtros', () => {
  it('período e filtros selecionados aparecem no arquivo com rótulos da tela', () => {
    const payload = build();
    expect(kpi(payload, 'Período')).toBe('01/09/2026 – 30/09/2026');
    expect(kpi(payload, 'Filtros')).toBe('Filial: Matriz · Veículo: ABC-1234');
    expect(kpi(payload, 'Filtros')).not.toContain('Filial Sul');
  });

  it('outra filial muda o rótulo de escopo', () => {
    const payload = build(false, {...FILTERS, branchId: 'branch-2', vehicleId: undefined});
    expect(kpi(payload, 'Filtros')).toBe('Filial: Filial Sul');
  });

  it('opções de filtro ainda não carregadas não viram "Nenhum"', () => {
    const payload = buildOperationalDreExportPayload({
      data: makeDre(),
      byRoute: makeByRoute(),
      filters: FILTERS,
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

  it('nome do arquivo inclui o período filtrado', () => {
    expect(operationalDreExportFilenameBase(FILTERS)).toBe(
      'dre-operacional_2026-09-01_2026-09-30',
    );
    expect(operationalDreExportFilenameBase({})).toBe('dre-operacional');
  });

  it('a tela monta o payload com data/byRoute/initialFilters recebidos do loader', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'features/dre/components/operational-dre-view.tsx'),
      'utf8',
    );
    expect(source).toContain('<AnalyticsExportToolbar');
    expect(source).toContain('filters={initialFilters}');
    expect(source).toContain('basePath={ROUTES.dashboardDre}');
    expect(source).toContain('filenameBase={operationalDreExportFilenameBase(initialFilters)}');
    expect(source).toMatch(
      /buildOperationalDreExportPayload\(\{\s*data,\s*byRoute,\s*filters: initialFilters,\s*filterOptions,\s*\}\)/,
    );
  });
});

describe('Audit #24 — arquivo XLSX da DRE', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('baixa .xlsx com MIME OOXML e valores iguais aos do loader', async () => {
    const anchor = {href: '', download: '', click: vi.fn()};
    vi.stubGlobal('document', {createElement: vi.fn(() => anchor)});
    let blob: Blob | undefined;
    vi.spyOn(URL, 'createObjectURL').mockImplementation((value) => {
      blob = value as Blob;
      return 'blob:dre';
    });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    await exportAnalyticsExcel(build(), operationalDreExportFilenameBase(FILTERS));

    expect(anchor.download).toBe('dre-operacional_2026-09-01_2026-09-30.xlsx');
    expect(blob!.type).toBe(ANALYTICS_XLSX_MIME_TYPE);

    const workbook = XLSX.read(new Uint8Array(await blob!.arrayBuffer()), {type: 'array'});
    expect(workbook.SheetNames).toEqual(['DRE Operacional']);
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(
      workbook.Sheets['DRE Operacional']!,
      {header: 1, blankrows: true, defval: null},
    );
    const flat = matrix.map((row) => row.filter((cell) => cell != null));

    expect(flat).toContainEqual(['Tabela Analítica']);
    expect(flat).toContainEqual(['Receita', 5000, 100]);
    expect(flat).toContainEqual(['Combustível', 1200, 24]);
    expect(flat).toContainEqual(['Custos por Rota']);
    expect(flat).toContainEqual(['SLZ → IMP', 3, 4000, 1500, 2500, 62.5, 1.875, 5]);
    expect(flat).toContainEqual(['OPER — Operacional', 1500, 75]);
  });
});
