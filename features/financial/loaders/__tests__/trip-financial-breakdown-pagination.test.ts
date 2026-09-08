import {beforeEach, describe, expect, it, vi} from 'vitest';

import {getTripFinancialBreakdown} from '../trip-financial-breakdown-loader';

vi.mock('@/features/trips/queries', () => ({
  getTripById: vi.fn(),
}));

vi.mock('../../queries/financial-entries', () => ({
  listFinancialEntriesByRelation: vi.fn().mockResolvedValue([]),
}));

import {getTripById} from '@/features/trips/queries';

const getTripByIdMock = vi.mocked(getTripById);

describe('trip financial breakdown mileage pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTripByIdMock.mockResolvedValue({
      id: 'trip-1',
      vehicleId: 'vehicle-1',
      contractedFreightValue: 100,
      actualFreightValue: null,
      completedAt: '2026-07-15T12:00:00.000Z',
    } as never);
  });

  it('fetchVehicleTripsForMileage pages >1000 trips with stable id order', async () => {
    const tripRows = Array.from({length: 1001}, (_, i) => ({
      id: `t${String(i).padStart(4, '0')}`,
      vehicle_id: 'vehicle-1',
      initial_odometer_km: i * 10,
      final_odometer_km: i * 10 + 10,
      planned_distance_km: 10,
    }));

    const rangeCalls: Array<{
      from: number;
      to: number;
      orders: Array<{column: string; ascending?: boolean}>;
    }> = [];

    function tripsBuilder() {
      const orders: Array<{column: string; ascending?: boolean}> = [];
      const api: Record<string, unknown> = {};
      const self = () => api;
      api.select = vi.fn(self);
      api.eq = vi.fn(self);
      api.is = vi.fn(self);
      api.gte = vi.fn(self);
      api.lte = vi.fn(self);
      api.order = vi.fn((column: string, opts?: {ascending?: boolean}) => {
        orders.push({column, ascending: opts?.ascending});
        return self();
      });
      api.range = vi.fn(async (from: number, to: number) => {
        rangeCalls.push({from, to, orders: [...orders]});
        return {
          data: tripRows.slice(from, to + 1),
          error: null,
          count: tripRows.length,
        };
      });
      return api;
    }

    function emptyExpensesBuilder() {
      const api: Record<string, unknown> = {};
      const self = () => api;
      api.select = vi.fn(self);
      api.eq = vi.fn(self);
      api.is = vi.fn(self);
      api.not = vi.fn(self);
      api.gte = vi.fn(self);
      api.lte = vi.fn(self);
      api.order = vi.fn(self);
      api.range = vi.fn(async () => ({data: [], error: null, count: 0}));
      return api;
    }

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'trips') return tripsBuilder();
        return emptyExpensesBuilder();
      }),
    };

    await getTripFinancialBreakdown(supabase as never, 'company-1', 'trip-1', {
      dateFrom: '2026-07-01',
      dateTo: '2026-07-31',
    });

    expect(rangeCalls).toEqual([
      {from: 0, to: 999, orders: [{column: 'id', ascending: true}]},
      {from: 1000, to: 1000, orders: [{column: 'id', ascending: true}]},
    ]);
  });
});
