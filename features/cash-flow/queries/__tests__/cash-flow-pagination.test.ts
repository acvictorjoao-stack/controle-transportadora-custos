import {beforeEach, describe, expect, it, vi} from 'vitest';

import {getCashFlowSummary, listCashFlow} from '../cash-flow';

vi.mock('@/features/financial/queries', () => ({
  listFinancialEntries: vi.fn(),
}));

import {listFinancialEntries} from '@/features/financial/queries';

const listFinancialEntriesMock = vi.mocked(listFinancialEntries);

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
    supabase: {
      from: vi.fn(() => builder()),
    },
  };
}

describe('cash-flow PostgREST pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getCashFlowSummary sums all 1001 entries across pages', async () => {
    const allRows = Array.from({length: 1001}, (_, i) => ({
      entry_type: 'revenue' as const,
      entry_status: 'paid' as const,
      amount: 1,
      paid_amount: 1,
      source_module: 'accounts_receivable',
    }));

    const {rangeCalls, orderCalls, supabase} = createPagedChainMock(allRows);
    const summary = await getCashFlowSummary(supabase as never, 'company-1');

    expect(summary.entradasRecebidas).toBe(1001);
    expect(rangeCalls).toEqual([
      [0, 999],
      [1000, 1000],
    ]);
    expect(orderCalls[0]).toEqual([{column: 'id', ascending: true}]);
  });

  it('listCashFlow prior aggregate pages when from > 1000 with date+id order', async () => {
    // pageSize = 10 → page 102 => from = 1010 (precisa fatiar prior 0..1009)
    listFinancialEntriesMock.mockResolvedValue({
      items: [],
      total: 1050,
      page: 102,
      pageSize: 10,
      totalPages: 105,
    });

    // Same entry_date for all rows — desempate por id deve estar na query.
    const priorAndTotal = Array.from({length: 1050}, (_, i) => ({
      id: `id-${String(i).padStart(4, '0')}`,
      entry_type: i % 2 === 0 ? 'revenue' : 'expense',
      entry_status: 'paid',
      amount: 1,
      paid_amount: 1,
      source_module:
        i % 2 === 0 ? 'accounts_receivable' : 'accounts_payable',
      entry_date: '2026-07-01',
      due_date: null,
      paid_at: '2026-07-01',
    }));

    const {rangeCalls, orderCalls, supabase} = createPagedChainMock(priorAndTotal);

    await listCashFlow(supabase as never, {
      companyId: 'company-1',
      page: 102,
    });

    // prior: 0-999, 1000-1009; total: 0-999, 1000-1049
    expect(rangeCalls.some((c) => c[0] === 0 && c[1] === 999)).toBe(true);
    expect(rangeCalls.some((c) => c[0] === 1000 && c[1] === 1009)).toBe(true);
    expect(rangeCalls.some((c) => c[0] === 1000 && c[1] === 1049)).toBe(true);

    const hasDateThenId = orderCalls.some(
      (orders) =>
        orders[0]?.column === 'entry_date' &&
        orders[0]?.ascending === false &&
        orders[1]?.column === 'id' &&
        orders[1]?.ascending === false,
    );
    expect(hasDateThenId).toBe(true);
  });

  it('listCashFlow fails when prior intermediate page under-fetches', async () => {
    listFinancialEntriesMock.mockResolvedValue({
      items: [],
      total: 1050,
      page: 102,
      pageSize: 10,
      totalPages: 105,
    });

    const allRows = Array.from({length: 1050}, (_, i) => ({
      entry_type: 'revenue',
      entry_status: 'paid',
      amount: 1,
      paid_amount: 1,
      source_module: 'accounts_receivable',
      entry_date: '2026-07-01',
      due_date: null,
      paid_at: '2026-07-01',
    }));

    function builder() {
      const api: Record<string, unknown> = {};
      const self = () => api;
      api.select = vi.fn(self);
      api.eq = vi.fn(self);
      api.is = vi.fn(self);
      api.in = vi.fn(self);
      api.gte = vi.fn(self);
      api.lte = vi.fn(self);
      api.or = vi.fn(self);
      api.order = vi.fn(self);
      api.range = vi.fn(async (from: number, to: number) => {
        // Página intermediária incompleta (solicitou 1000, retorna 500).
        if (from === 0 && to === 999) {
          return {
            data: allRows.slice(0, 500),
            error: null,
            count: allRows.length,
          };
        }
        return {
          data: allRows.slice(from, to + 1),
          error: null,
          count: allRows.length,
        };
      });
      return api;
    }

    const supabase = {from: vi.fn(() => builder())};

    await expect(
      listCashFlow(supabase as never, {
        companyId: 'company-1',
        page: 102,
      }),
    ).rejects.toThrow();
  });
});
