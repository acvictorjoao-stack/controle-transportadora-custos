import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import type {OperationalDreData} from '@/features/dre/types';
import type {FinancialDashboardData} from '@/features/financial-dashboard/types';

import {
  buildExecutiveDashboardKpis,
  EXECUTIVE_OPEN_BALANCE_META,
  getExecutiveDashboardCore,
} from '../executive-dashboard-loader';

const getOperationalDreBundle = vi.hoisted(() => vi.fn());
const getFinancialDashboardData = vi.hoisted(() => vi.fn());
const getMaintenanceStats = vi.hoisted(() => vi.fn());
const listRoutesWithoutLeadTime = vi.hoisted(() => vi.fn());

vi.mock('@/features/dre/loaders', () => ({
  getOperationalDreBundle,
}));

vi.mock('@/features/financial-dashboard/queries', () => ({
  getFinancialDashboardData,
}));

vi.mock('@/features/maintenance/queries', () => ({
  getMaintenanceStats,
}));

vi.mock('@/features/cadastro-quality/queries', () => ({
  listRoutesWithoutLeadTime,
}));

function makeDre(overrides: {
  revenue: number;
  costs: number;
  trips: number;
  km: number;
  costsOnlyMode?: boolean;
}): OperationalDreData {
  const costsOnlyMode = overrides.costsOnlyMode ?? false;
  const operatingProfit = costsOnlyMode
    ? null
    : overrides.revenue - overrides.costs;
  return {
    filters: costsOnlyMode ? {costCenterId: 'cc-1'} : {},
    costsOnlyMode,
    revenues: {
      freightRevenue: costsOnlyMode ? 0 : overrides.revenue,
      totalRevenue: costsOnlyMode ? 0 : overrides.revenue,
    },
    costs: {
      fuel: 0,
      maintenance: 0,
      tires: 0,
      financial: 0,
      accountsPayable: 0,
      other: overrides.costs,
      totalOperatingCosts: overrides.costs,
      allocatedOperatingCosts: overrides.costs,
      unattributableOperatingCosts: 0,
    },
    result: {
      operatingProfit,
      operatingMarginPercent:
        costsOnlyMode || overrides.revenue <= 0 || operatingProfit == null
          ? null
          : (operatingProfit / overrides.revenue) * 100,
    },
    indicators: {
      totalKm: overrides.km,
      tripCount: overrides.trips,
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

describe('buildExecutiveDashboardKpis', () => {
  it('mapeia DRE filtrada e AP/AR company-wide com meta open_balance', () => {
    const kpis = buildExecutiveDashboardKpis(
      makeDre({revenue: 1000, costs: 400, trips: 2, km: 50}),
      makeFinancial(777, 888),
    );

    expect(kpis.totalRevenue).toBe(1000);
    expect(kpis.totalCosts).toBe(400);
    expect(kpis.operatingProfit).toBe(600);
    expect(kpis.completedTrips).toBe(2);
    expect(kpis.totalKm).toBe(50);
    expect(kpis.accountsPayable).toBe(777);
    expect(kpis.accountsReceivable).toBe(888);
    expect(kpis.openBalances).toEqual(EXECUTIVE_OPEN_BALANCE_META);
    expect(kpis.openBalances.scope).toBe('company');
    expect(kpis.openBalances.period).toBe('open_balance');
    expect(kpis.openBalances.includesPayroll).toBe(false);
    expect(kpis.costsOnlyMode).toBe(false);
  });

  it('Audit #6: costs-only mode nulls P&L KPIs and keeps AP/AR untouched', () => {
    const kpis = buildExecutiveDashboardKpis(
      makeDre({
        revenue: 1000,
        costs: 400,
        trips: 2,
        km: 50,
        costsOnlyMode: true,
      }),
      makeFinancial(777, 888),
    );

    expect(kpis.costsOnlyMode).toBe(true);
    expect(kpis.totalRevenue).toBe(0);
    expect(kpis.totalCosts).toBe(400);
    expect(kpis.operatingProfit).toBeNull();
    expect(kpis.operatingMarginPercent).toBeNull();
    expect(kpis.accountsPayable).toBe(777);
    expect(kpis.accountsReceivable).toBe(888);
    expect(kpis.openBalances).toEqual(EXECUTIVE_OPEN_BALANCE_META);
  });

  it('mantém AP/AR estáveis quando a DRE muda (filtros/período)', () => {
    const financial = makeFinancial(1200, 3400);
    const filtered = buildExecutiveDashboardKpis(
      makeDre({revenue: 100, costs: 90, trips: 1, km: 10}),
      financial,
    );
    const wider = buildExecutiveDashboardKpis(
      makeDre({revenue: 9000, costs: 1000, trips: 40, km: 800}),
      financial,
    );

    expect(filtered.totalRevenue).not.toBe(wider.totalRevenue);
    expect(filtered.totalCosts).not.toBe(wider.totalCosts);
    expect(filtered.accountsPayable).toBe(1200);
    expect(wider.accountsPayable).toBe(1200);
    expect(filtered.accountsReceivable).toBe(3400);
    expect(wider.accountsReceivable).toBe(3400);
  });

  it('custos DRE incluem folha no total operacional; meta AP/AR exclui folha', () => {
    const kpis = buildExecutiveDashboardKpis(
      makeDre({revenue: 500, costs: 250, trips: 1, km: 1}),
      makeFinancial(99, 11),
    );
    // other bucket (payroll) já consolidado em totalOperatingCosts pela DRE
    expect(kpis.totalCosts).toBe(250);
    expect(kpis.openBalances.includesPayroll).toBe(false);
  });
});

describe('getExecutiveDashboardCore', () => {
  beforeEach(() => {
    getOperationalDreBundle.mockReset();
    getFinancialDashboardData.mockReset();
    getMaintenanceStats.mockReset();
  });

  it('passa filtros só para a DRE e chama financeiro só com companyId', async () => {
    const dre = makeDre({revenue: 10, costs: 5, trips: 1, km: 2});
    getOperationalDreBundle.mockResolvedValue({
      dre,
      byRoute: {groups: [], filters: {}},
      byCustomer: [],
    });
    getFinancialDashboardData.mockResolvedValue(makeFinancial(50, 60));
    getMaintenanceStats.mockResolvedValue({
      totalRecords: 0,
      openCount: 0,
      completedCount: 0,
      totalAmount: 0,
    });

    const filters = {
      dateFrom: '2026-09-01',
      dateTo: '2026-09-30',
      branchId: 'branch-1',
      customerId: 'customer-1',
      routeId: 'route-1',
      vehicleId: 'vehicle-1',
      driverId: 'driver-1',
      costCenterId: 'cc-1',
    };

    const supabase = {} as never;
    const core = await getExecutiveDashboardCore(supabase, 'company-1', filters);

    expect(getOperationalDreBundle).toHaveBeenCalledWith(
      supabase,
      'company-1',
      expect.objectContaining(filters),
    );
    expect(getFinancialDashboardData).toHaveBeenCalledTimes(1);
    expect(getFinancialDashboardData).toHaveBeenCalledWith(supabase, 'company-1');
    expect(getFinancialDashboardData.mock.calls[0]).toHaveLength(2);

    expect(core.kpis.accountsPayable).toBe(50);
    expect(core.kpis.accountsReceivable).toBe(60);
    expect(core.kpis.openBalances.period).toBe('open_balance');
    expect(core.kpis.openBalances.scope).toBe('company');
  });
});

describe('executive dashboard loader source contract', () => {
  it('não altera queries de cash-flow / financial dashboard / AP / AR', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'features/organization/dashboard/loaders/executive-dashboard-loader.ts',
      ),
      'utf8',
    );

    expect(source).toContain('getFinancialDashboardData(supabase, companyId)');
    expect(source).toContain('getOperationalDreBundle(supabase, companyId, period)');
    expect(source).not.toContain('getCashFlowSummary');
    expect(source).not.toContain('listAccountsPayable');
    expect(source).not.toContain('listAccountsReceivable');
  });
});
