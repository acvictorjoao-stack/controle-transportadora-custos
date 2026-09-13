import type {SupabaseClient} from '@supabase/supabase-js';
import {beforeEach, describe, expect, it, vi} from 'vitest';

const getCustomerStats = vi.hoisted(() => vi.fn());
const getDriverStats = vi.hoisted(() => vi.fn());
const getVehicleStats = vi.hoisted(() => vi.fn());
const listTrips = vi.hoisted(() => vi.fn());

vi.mock('@/features/customers/queries', () => ({
  getCustomerStats,
}));

vi.mock('@/features/drivers/queries', () => ({
  getDriverStats,
}));

vi.mock('@/features/vehicles/queries', () => ({
  getVehicleStats,
}));

vi.mock('@/features/trips/queries', () => ({
  listTrips,
}));

import {getOperationalDashboardData} from '../operational-dashboard';

type TableResult = {data?: unknown; count?: number | null; error: {message: string} | null};

/**
 * Stub encadeável: cada tabela resolve com o resultado configurado.
 * Audit #10 — falha de query deve rejeitar, não devolver zeros.
 */
function createSupabaseStub(resultsByTable: Record<string, TableResult>) {
  const client = {
    from(table: string) {
      const result = resultsByTable[table] ?? {data: [], error: null};
      const chain = {
        select: () => chain,
        eq: () => chain,
        is: () => chain,
        then: (resolve: (value: TableResult) => unknown) => resolve(result),
      };
      return chain;
    },
  };

  return client as unknown as SupabaseClient;
}

describe('getOperationalDashboardData — Audit #10', () => {
  beforeEach(() => {
    getCustomerStats.mockReset();
    getDriverStats.mockReset();
    getVehicleStats.mockReset();
    listTrips.mockReset();

    getCustomerStats.mockResolvedValue({active: 1});
    getVehicleStats.mockResolvedValue({active: 2, maintenance: 0});
    getDriverStats.mockResolvedValue({active: 3, inactive: 0});
    listTrips.mockResolvedValue({items: [], total: 0, page: 1, pageSize: 10, totalPages: 1});
  });

  it('rejeita quando a query de trips falha (não mascara com zeros)', async () => {
    const supabase = createSupabaseStub({
      trips: {data: null, error: {message: 'RLS denied'}},
      trip_expenses: {data: [], error: null},
      routes: {count: 0, error: null},
    });

    await expect(getOperationalDashboardData(supabase, 'company-1')).rejects.toThrow(
      'Não foi possível concluir a operação.',
    );
  });

  it('rejeita quando a query de trip_expenses falha', async () => {
    const supabase = createSupabaseStub({
      trips: {data: [], error: null},
      trip_expenses: {data: null, error: {message: 'network error'}},
      routes: {count: 1, error: null},
    });

    await expect(getOperationalDashboardData(supabase, 'company-1')).rejects.toThrow(
      'Não foi possível concluir a operação.',
    );
  });

  it('rejeita quando o count de routes falha', async () => {
    const supabase = createSupabaseStub({
      trips: {data: [], error: null},
      trip_expenses: {data: [], error: null},
      routes: {count: null, error: {message: 'timeout'}},
    });

    await expect(getOperationalDashboardData(supabase, 'company-1')).rejects.toThrow(
      'Não foi possível concluir a operação.',
    );
  });

  it('retorna KPIs zerados apenas quando as queries sucedem sem dados', async () => {
    const supabase = createSupabaseStub({
      trips: {data: [], error: null},
      trip_expenses: {data: [], error: null},
      routes: {count: 0, error: null},
    });

    const data = await getOperationalDashboardData(supabase, 'company-1');

    expect(data.trips).toEqual({
      programmed: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
    });
    expect(data.financial.totalFreight).toBe(0);
    expect(data.financial.totalExpenses).toBe(0);
    expect(data.registries.activeRoutes).toBe(0);
    expect(data.registries.activeCustomers).toBe(1);
  });
});
