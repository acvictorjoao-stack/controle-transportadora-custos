import {beforeEach, describe, expect, it, vi} from 'vitest';

import {fetchOperationalDreExpenses} from '../operational-dre-data';

/**
 * Captura o `.or(...)` aplicado na query de despesas (Audit #7).
 */
function createExpenseOrCaptureMock() {
  const orCalls: string[] = [];
  const gteCalls: Array<[string, string]> = [];
  const lteCalls: Array<[string, string]> = [];

  function expenseBuilder() {
    const api: Record<string, unknown> = {};
    const self = () => api;
    api.select = vi.fn(self);
    api.eq = vi.fn(self);
    api.is = vi.fn(self);
    api.not = vi.fn(self);
    api.gte = vi.fn((column: string, value: string) => {
      gteCalls.push([column, value]);
      return self();
    });
    api.lte = vi.fn((column: string, value: string) => {
      lteCalls.push([column, value]);
      return self();
    });
    api.or = vi.fn((expr: string) => {
      orCalls.push(expr);
      return self();
    });
    api.order = vi.fn(self);
    api.range = vi.fn(async () => ({
      data: [],
      error: null,
      count: 0,
    }));
    return api;
  }

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === 'cost_centers') {
        return {
          select: () => ({
            eq: () => ({
              in: () => ({
                is: async () => ({data: [], error: null}),
              }),
            }),
          }),
        };
      }
      return expenseBuilder();
    }),
  };

  return {supabase, orCalls, gteCalls, lteCalls};
}

describe('fetchOperationalDreExpenses — Audit #7 competence OR', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não aplica entry_date na query base; coloca no braço órfão do OR', async () => {
    const {supabase, orCalls, gteCalls, lteCalls} = createExpenseOrCaptureMock();

    await fetchOperationalDreExpenses(supabase as never, 'company-1', {
      filters: {dateFrom: '2026-07-01', dateTo: '2026-07-31'},
      tripIds: ['trip-july'],
    });

    expect(gteCalls.filter(([col]) => col === 'entry_date')).toEqual([]);
    expect(lteCalls.filter(([col]) => col === 'entry_date')).toEqual([]);
    expect(orCalls).toEqual([
      'trip_id.in.(trip-july),and(trip_id.is.null,entry_date.gte.2026-07-01,entry_date.lte.2026-07-31)',
    ]);
  });

  it('vinculados a T entram no OR sem predicado de entry_date no braço trip_id.in', async () => {
    const {supabase, orCalls} = createExpenseOrCaptureMock();

    await fetchOperationalDreExpenses(supabase as never, 'company-1', {
      filters: {
        dateFrom: '2026-07-01',
        dateTo: '2026-07-31',
        driverId: 'driver-1',
      },
      tripIds: ['trip-july'],
    });

    const expr = orCalls[0] ?? '';
    expect(expr.startsWith('trip_id.in.(trip-july),')).toBe(true);
    expect(expr).toContain(
      'and(trip_id.is.null,driver_id.eq.driver-1,entry_date.gte.2026-07-01,entry_date.lte.2026-07-31)',
    );
    // O braço trip_id.in não embute entry_date.
    expect(expr).not.toMatch(/trip_id\.in\.\([^)]*entry_date/);
  });
});
