import {describe, expect, it, vi} from 'vitest';

import {getFinancialDashboardData} from '../financial-dashboard';
import {getPayrollSummary} from '@/features/payroll/queries/payroll-expenses';
import {
  listVehicleCompletedTripsForConsumption,
  listVehicleFuelRecordsForConsumption,
} from '@/features/fuel/queries/consumption-queries';

vi.mock('@/features/cash-flow/queries', () => ({
  getCashFlowSummary: vi.fn().mockResolvedValue({
    entradasRecebidas: 0,
    saidasPagas: 0,
    saldoAtual: 0,
    aReceber: 0,
    aPagar: 0,
    saldoProjetado: 0,
  }),
}));

vi.mock('@/features/financial/queries', () => ({
  listFinancialEntries: vi.fn().mockResolvedValue({
    items: [],
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 1,
  }),
}));

function createPagedChainMock(allRows: Record<string, unknown>[]) {
  const rangeCalls: Array<[number, number]> = [];
  const orderCalls: Array<Array<{column: string; ascending?: boolean}>> = [];

  function builder() {
    const orders: Array<{column: string; ascending?: boolean}> = [];
    const api: Record<string, unknown> = {};
    const self = () => api;
    api.select = vi.fn(self);
    api.eq = vi.fn(self);
    api.is = vi.fn(self);
    api.in = vi.fn(self);
    api.gte = vi.fn(self);
    api.lte = vi.fn(self);
    api.not = vi.fn(self);
    api.or = vi.fn(self);
    api.order = vi.fn((column: string, opts?: {ascending?: boolean}) => {
      orders.push({column, ascending: opts?.ascending});
      return self();
    });
    api.range = vi.fn(async (from: number, to: number) => {
      rangeCalls.push([from, to]);
      orderCalls.push([...orders]);
      return {
        data: allRows.slice(from, to + 1),
        error: null,
        count: allRows.length,
      };
    });
    return api;
  }

  return {
    rangeCalls,
    orderCalls,
    supabase: {from: vi.fn(() => builder())},
  };
}

describe('financial dashboard / payroll / fuel pagination', () => {
  it('getFinancialDashboardData reads >1000 metric rows with stable id order', async () => {
    const rows = Array.from({length: 1001}, (_, i) => ({
      entry_type: 'revenue',
      entry_status: 'pending',
      amount: 1,
      paid_amount: null,
      source_module: 'accounts_receivable',
      due_date: '2026-08-01',
      paid_at: null,
    }));
    const {rangeCalls, orderCalls, supabase} = createPagedChainMock(rows);
    const data = await getFinancialDashboardData(supabase as never, 'company-1');
    expect(data.contasAReceber.quantidade).toBe(1001);
    expect(rangeCalls).toHaveLength(2);
    expect(orderCalls[0]).toEqual([{column: 'id', ascending: true}]);
  });

  it('getPayrollSummary sums >1000 payroll rows with stable id order', async () => {
    const rows = Array.from({length: 1001}, (_, i) => ({
      amount: 10,
      expense_status: 'pending',
      employee_id: `e${i}`,
      driver_id: null,
    }));
    const {rangeCalls, orderCalls, supabase} = createPagedChainMock(rows);
    const summary = await getPayrollSummary(supabase as never, 'company-1');
    expect(summary.totalPending).toBe(10010);
    expect(summary.peopleCount).toBe(1001);
    expect(rangeCalls).toEqual([
      [0, 999],
      [1000, 1000],
    ]);
    expect(orderCalls[0]).toEqual([{column: 'id', ascending: true}]);
  });

  it('listVehicleFuelRecordsForConsumption pages beyond 1000', async () => {
    const rows = Array.from({length: 1001}, (_, i) => ({
      id: `f${i}`,
      odometer_km: i * 10,
      quantity_liters: 1,
      total_amount: 5,
      price_per_liter: 5,
      fueled_at: '2026-07-01T00:00:00.000Z',
    }));
    const {rangeCalls, supabase} = createPagedChainMock(rows);
    const result = await listVehicleFuelRecordsForConsumption(
      supabase as never,
      'company-1',
      'v1',
    );
    expect(result).toHaveLength(1001);
    expect(rangeCalls).toHaveLength(2);
  });

  it('listVehicleCompletedTripsForConsumption pages beyond 1000', async () => {
    const rows = Array.from({length: 1001}, (_, i) => ({
      id: `t${i}`,
      initial_odometer_km: i,
      final_odometer_km: i + 1,
      route_id: null,
      customer_id: null,
      driver_id: null,
    }));
    const {rangeCalls, supabase} = createPagedChainMock(rows);
    const result = await listVehicleCompletedTripsForConsumption(
      supabase as never,
      'company-1',
      'v1',
    );
    expect(result).toHaveLength(1001);
    expect(rangeCalls).toHaveLength(2);
  });
});
