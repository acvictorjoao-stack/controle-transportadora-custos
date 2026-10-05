import type {SupabaseClient} from '@supabase/supabase-js';
import {describe, expect, it, vi} from 'vitest';

import {allocateOperationalCostsByMileage} from '@/features/financial/services/allocate-operational-costs-by-mileage';

import {calculateOperationalDre} from '../../services/operational-dre-calculator';
import type {OperationalDreExpenseRow} from '../../types';
import {
  fetchOperationalDreTrips,
  fetchOperationalDreTripsForVehicles,
} from '../operational-dre-data';

function tripRaw(overrides: Record<string, unknown> & {id: string}) {
  return {
    branch_id: null,
    customer_id: 'customer-1',
    route_id: 'route-1',
    vehicle_id: 'vehicle-1',
    driver_id: 'driver-1',
    contracted_freight_value: 1000,
    actual_freight_value: null,
    initial_odometer_km: null,
    final_odometer_km: null,
    planned_distance_km: null,
    ...overrides,
  };
}

function createTripsQueryStub(rows: Record<string, unknown>[]) {
  const eqCalls: Array<[string, unknown]> = [];
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn((column: string, value: unknown) => {
      eqCalls.push([column, value]);
      return query;
    }),
    is: vi.fn(() => query),
    gte: vi.fn(() => query),
    lt: vi.fn(() => query),
    in: vi.fn(() => query),
    or: vi.fn(() => query),
    order: vi.fn(() => query),
    range: vi.fn(async (from: number, to: number) => ({
      data: rows.slice(from, to + 1),
      error: null,
      count: rows.length,
    })),
  };

  return {
    eqCalls,
    client: {from: vi.fn(() => query)} as unknown as SupabaseClient,
  };
}

function vehicleExpense(id: string, amount: number): OperationalDreExpenseRow {
  return {
    id,
    amount,
    branchId: null,
    customerId: null,
    tripId: null,
    vehicleId: 'vehicle-1',
    driverId: null,
    sourceModule: 'maintenance',
    categorySlug: 'manutencao',
    fuelRecordId: null,
    maintenanceRecordId: null,
    tireId: null,
    costCenterId: null,
    costCenterCode: null,
    costCenterName: null,
  };
}

describe('Audit #17 — DRE trip distance mapping', () => {
  it('only completed trips feed DRE km (no invented km for open trips)', async () => {
    const {client, eqCalls} = createTripsQueryStub([]);
    await fetchOperationalDreTrips(client, 'company-1');
    expect(eqCalls).toContainEqual(['company_id', 'company-1']);
    expect(eqCalls).toContainEqual(['trip_status', 'completed']);
  });

  it('maps real km when valid, existing planned fallback otherwise', async () => {
    const {client} = createTripsQueryStub([
      tripRaw({id: 'real', initial_odometer_km: 1000, final_odometer_km: 1100, planned_distance_km: 900}),
      tripRaw({id: 'no-initial', final_odometer_km: 5000, planned_distance_km: 200}),
      tripRaw({id: 'zero', initial_odometer_km: 3000, final_odometer_km: 3000, planned_distance_km: 50}),
      tripRaw({id: 'nothing'}),
      tripRaw({id: 'bad-planned', planned_distance_km: -10}),
    ]);

    const trips = await fetchOperationalDreTrips(client, 'company-1');
    const km = Object.fromEntries(trips.map((trip) => [trip.id, trip.distanceKm]));
    expect(km).toEqual({
      real: 100,
      'no-initial': 200,
      zero: 50,
      nothing: 0,
      'bad-planned': 0,
    });
  });

  it('rateio base (trips for vehicles) uses the same definition', async () => {
    const {client} = createTripsQueryStub([
      tripRaw({id: 'real', initial_odometer_km: 1000, final_odometer_km: 1100, planned_distance_km: 900}),
      tripRaw({id: 'no-initial', final_odometer_km: 5000, planned_distance_km: 200}),
    ]);

    const trips = await fetchOperationalDreTripsForVehicles(client, 'company-1', ['vehicle-1']);
    expect(trips.map((trip) => trip.distanceKm)).toEqual([100, 200]);
  });
});

describe('Audit #17 — rateio and DRE indicators use real km', () => {
  it('planned ≠ real: allocateOperationalCostsByMileage splits by real km', async () => {
    const {client} = createTripsQueryStub([
      tripRaw({id: 't1', initial_odometer_km: 1000, final_odometer_km: 1100, planned_distance_km: 900}),
      tripRaw({id: 't2', initial_odometer_km: 2000, final_odometer_km: 2300, planned_distance_km: 100}),
    ]);
    const trips = await fetchOperationalDreTrips(client, 'company-1');

    const allocation = allocateOperationalCostsByMileage(
      [{id: 'shared', amount: 400, tripId: null, vehicleId: 'vehicle-1'}],
      trips.map((trip) => ({tripId: trip.id, vehicleId: trip.vehicleId, distanceKm: trip.distanceKm})),
    );

    expect(allocation.totalsByTripId.get('t1')).toBeCloseTo(100, 8);
    expect(allocation.totalsByTripId.get('t2')).toBeCloseTo(300, 8);
  });

  it('DRE totalKm / costPerKm follow real km; Audit #12 conservation holds', async () => {
    const {client} = createTripsQueryStub([
      tripRaw({id: 't1', initial_odometer_km: 1000, final_odometer_km: 1100, planned_distance_km: 900}),
      tripRaw({id: 't2', initial_odometer_km: 2000, final_odometer_km: 2300, planned_distance_km: 100}),
    ]);
    const trips = await fetchOperationalDreTrips(client, 'company-1');

    const dre = calculateOperationalDre(trips, [vehicleExpense('shared', 400)]);
    expect(dre.indicators.totalKm).toBe(400);
    expect(dre.indicators.costPerKm).toBe(1);
    expect(dre.costs.allocatedOperatingCosts).toBe(400);
    expect(dre.costs.unattributableOperatingCosts).toBe(0);
  });

  it('zero km everywhere: no division by zero, cost stays unattributable', async () => {
    const {client} = createTripsQueryStub([tripRaw({id: 't1'})]);
    const trips = await fetchOperationalDreTrips(client, 'company-1');

    const dre = calculateOperationalDre(trips, [vehicleExpense('shared', 250)]);
    expect(dre.indicators.totalKm).toBe(0);
    expect(dre.indicators.costPerKm).toBeNull();
    expect(dre.indicators.revenuePerKm).toBeNull();
    expect(dre.costs.totalOperatingCosts).toBe(250);
    expect(dre.costs.allocatedOperatingCosts).toBe(0);
    expect(dre.costs.unattributableOperatingCosts).toBe(250);
  });
});
