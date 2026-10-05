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

function createBuilder(rows: Record<string, unknown>[], eqCalls?: Array<[string, unknown]>) {
  const api: Record<string, unknown> = {};
  const self = () => api;
  api.select = vi.fn(self);
  api.eq = vi.fn((column: string, value: unknown) => {
    eqCalls?.push([column, value]);
    return api;
  });
  api.is = vi.fn(self);
  api.not = vi.fn(self);
  api.gte = vi.fn(self);
  api.lte = vi.fn(self);
  api.order = vi.fn(self);
  api.range = vi.fn(async (from: number, to: number) => ({
    data: rows.slice(from, to + 1),
    error: null,
    count: rows.length,
  }));
  return api;
}

const sharedExpense = {
  id: 'shared',
  company_id: 'company-1',
  branch_id: null,
  vehicle_id: 'vehicle-1',
  driver_id: null,
  trip_id: null,
  fuel_record_id: null,
  maintenance_record_id: null,
  tire_id: null,
  customer_id: null,
  customer_contract_id: null,
  category_id: null,
  cost_center_id: null,
  entry_type: 'expense',
  entry_status: 'pending',
  description: 'Manutenção',
  reference_number: null,
  supplier_id: null,
  supplier: null,
  client: null,
  amount: 400,
  currency: 'BRL',
  entry_date: '2026-07-10',
  due_date: null,
  paid_at: null,
  paid_amount: null,
  reversed_entry_id: null,
  source_module: 'maintenance',
  source_id: null,
  is_system_generated: false,
  installment_number: null,
};

describe('Audit #17 — trip financial breakdown rateio uses operational km', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTripByIdMock.mockResolvedValue({
      id: 'trip-1',
      vehicleId: 'vehicle-1',
      contractedFreightValue: 1000,
      actualFreightValue: null,
      completedAt: '2026-07-15T12:00:00.000Z',
    } as never);
  });

  it('planned ≠ real: share follows odometer km; only completed trips', async () => {
    const tripEqCalls: Array<[string, unknown]> = [];
    const tripRows = [
      {id: 'trip-1', vehicle_id: 'vehicle-1', initial_odometer_km: 1000, final_odometer_km: 1100, planned_distance_km: 900},
      {id: 'trip-2', vehicle_id: 'vehicle-1', initial_odometer_km: 2000, final_odometer_km: 2300, planned_distance_km: 100},
    ];
    const supabase = {
      from: vi.fn((table: string) =>
        table === 'trips'
          ? createBuilder(tripRows, tripEqCalls)
          : createBuilder([sharedExpense]),
      ),
    };

    const data = await getTripFinancialBreakdown(supabase as never, 'company-1', 'trip-1', {
      dateFrom: '2026-07-01',
      dateTo: '2026-07-31',
    });

    expect(tripEqCalls).toContainEqual(['trip_status', 'completed']);
    const entries = data.categories.flatMap((category) => category.entries);
    const shared = entries.find((entry) => entry.id === 'shared');
    expect(shared?.allocation).toBe('mileage');
    expect(shared?.allocationShare).toBeCloseTo(0.25, 8);
    expect(shared?.amount).toBeCloseTo(100, 8);
  });

  it('missing odometer: keeps the existing planned-km fallback', async () => {
    const tripRows = [
      {id: 'trip-1', vehicle_id: 'vehicle-1', initial_odometer_km: null, final_odometer_km: 5000, planned_distance_km: 100},
      {id: 'trip-2', vehicle_id: 'vehicle-1', initial_odometer_km: 2000, final_odometer_km: 2300, planned_distance_km: 900},
    ];
    const supabase = {
      from: vi.fn((table: string) =>
        table === 'trips' ? createBuilder(tripRows) : createBuilder([sharedExpense]),
      ),
    };

    const data = await getTripFinancialBreakdown(supabase as never, 'company-1', 'trip-1', {
      dateFrom: '2026-07-01',
      dateTo: '2026-07-31',
    });

    const shared = data.categories
      .flatMap((category) => category.entries)
      .find((entry) => entry.id === 'shared');
    expect(shared?.amount).toBeCloseTo(100, 8);
  });
});
