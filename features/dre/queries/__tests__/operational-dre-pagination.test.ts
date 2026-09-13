import {readFileSync} from 'node:fs';
import {join} from 'node:path';

import {beforeEach, describe, expect, it, vi} from 'vitest';

import {fetchOperationalDreExpenses, fetchOperationalDreTrips} from '../operational-dre-data';

/**
 * Mock chainável de PostgREST: simula páginas de 1000 + count exact + orders.
 */
function createPagedQueryMock<T extends {id: string}>(allRows: T[]) {
  const calls: Array<{
    from: number;
    to: number;
    countExact: boolean;
    orders: Array<{column: string; ascending?: boolean}>;
  }> = [];

  function buildBuilder() {
    let countExact = false;
    const orders: Array<{column: string; ascending?: boolean}> = [];
    const builder: Record<string, unknown> = {};
    const self = () => builder;

    builder.select = vi.fn((_cols?: string, opts?: {count?: string}) => {
      countExact = opts?.count === 'exact';
      return self();
    });
    builder.eq = vi.fn(self);
    builder.is = vi.fn(self);
    builder.not = vi.fn(self);
    builder.gte = vi.fn(self);
    builder.lte = vi.fn(self);
    builder.lt = vi.fn(self);
    builder.in = vi.fn(self);
    builder.or = vi.fn(self);
    builder.order = vi.fn((column: string, opts?: {ascending?: boolean}) => {
      orders.push({column, ascending: opts?.ascending});
      return self();
    });
    builder.range = vi.fn(async (from: number, to: number) => {
      calls.push({from, to, countExact, orders: [...orders]});
      const slice = allRows.slice(from, to + 1);
      return {
        data: slice,
        error: null,
        count: countExact ? allRows.length : null,
      };
    });

    return builder;
  }

  return {
    calls,
    supabase: {
      from: vi.fn(() => buildBuilder()),
    },
  };
}

describe('DRE PostgREST pagination (>1000)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchOperationalDreTrips accumulates 1001 trips with stable id order', async () => {
    const allRows = Array.from({length: 1001}, (_, i) => ({
      id: `t${String(i).padStart(4, '0')}`,
      branch_id: null,
      customer_id: null,
      route_id: null,
      vehicle_id: null,
      driver_id: null,
      contracted_freight_value: 100,
      actual_freight_value: null,
      initial_odometer_km: 0,
      final_odometer_km: 10,
      planned_distance_km: 10,
    }));

    const {calls, supabase} = createPagedQueryMock(allRows);
    const trips = await fetchOperationalDreTrips(supabase as never, 'company-1', {
      dateFrom: '2026-07-01',
      dateTo: '2026-07-31',
    });

    expect(trips).toHaveLength(1001);
    expect(calls).toHaveLength(2);
    expect(calls[0]).toMatchObject({
      from: 0,
      to: 999,
      countExact: true,
      orders: [{column: 'id', ascending: true}],
    });
    expect(calls[1]).toMatchObject({
      from: 1000,
      to: 1000,
      orders: [{column: 'id', ascending: true}],
    });
  });

  it('fetchOperationalDreExpenses short-circuits dimensional empty before querying', async () => {
    const supabase = {from: vi.fn()};
    // Rota dimensional sem trips elegíveis → conjunto vazio (sem query).
    const empty = await fetchOperationalDreExpenses(supabase as never, 'company-1', {
      filters: {routeId: 'r1'},
      tripIds: [],
    });
    expect(empty).toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('fetchOperationalDreExpenses accumulates 1001 expenses with stable id order', async () => {
    const allRows = Array.from({length: 1001}, (_, i) => ({
      id: `e${String(i).padStart(4, '0')}`,
      amount: 10,
      branch_id: null,
      customer_id: null,
      trip_id: null,
      vehicle_id: null,
      driver_id: null,
      source_module: 'fuel',
      fuel_record_id: null,
      maintenance_record_id: null,
      tire_id: null,
      cost_center_id: null,
      financial_categories: null,
    }));

    const rangeCalls: Array<{
      from: number;
      to: number;
      orders: Array<{column: string; ascending?: boolean}>;
    }> = [];

    function expenseBuilder() {
      const orders: Array<{column: string; ascending?: boolean}> = [];
      const api: Record<string, unknown> = {};
      const self = () => api;
      api.select = vi.fn(self);
      api.eq = vi.fn(self);
      api.is = vi.fn(self);
      api.not = vi.fn(self);
      api.gte = vi.fn(self);
      api.lte = vi.fn(self);
      api.or = vi.fn(self);
      api.order = vi.fn((column: string, opts?: {ascending?: boolean}) => {
        orders.push({column, ascending: opts?.ascending});
        return self();
      });
      api.range = vi.fn(async (from: number, to: number) => {
        rangeCalls.push({from, to, orders: [...orders]});
        return {
          data: allRows.slice(from, to + 1),
          error: null,
          count: allRows.length,
        };
      });
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

    const expenses = await fetchOperationalDreExpenses(
      supabase as never,
      'company-1',
      {},
    );

    expect(expenses).toHaveLength(1001);
    expect(rangeCalls).toEqual([
      {from: 0, to: 999, orders: [{column: 'id', ascending: true}]},
      {from: 1000, to: 1000, orders: [{column: 'id', ascending: true}]},
    ]);
  });
});

describe('max_rows config', () => {
  it('keeps supabase/config.toml max_rows = 1000', () => {
    const config = readFileSync(
      join(process.cwd(), 'supabase/config.toml'),
      'utf8',
    );
    expect(config).toMatch(/max_rows\s*=\s*1000/);
  });
});
