import {describe, expect, it} from 'vitest';

import {
  buildTripMetrics,
  calculateOperationalDreByRoute,
  calculateOperationalDreRouteTrips,
  groupOperationalDreByDimension,
  OPERATIONAL_DRE_UNASSIGNED_DIMENSION_KEY,
  sumTripCosts,
} from '../operational-dre-by-dimension';
import type {
  OperationalDreExpenseRow,
  OperationalDreTripDetailRow,
  OperationalDreTripRow,
} from '../../types';

function makeTrip(
  overrides: Partial<OperationalDreTripRow> = {},
): OperationalDreTripRow {
  return {
    id: 'trip-1',
    branchId: 'branch-1',
    customerId: 'customer-1',
    routeId: 'route-1',
    vehicleId: 'vehicle-1',
    contractedFreightValue: 1000,
    actualFreightValue: null,
    distanceKm: 100,
    ...overrides,
  };
}

function makeTripDetail(
  overrides: Partial<OperationalDreTripDetailRow> = {},
): OperationalDreTripDetailRow {
  return {
    ...makeTrip(),
    tripNumber: 'VG-001',
    completedAt: '2026-07-12T10:00:00.000Z',
    driverId: 'driver-1',
    vehicleLabel: 'ABC1234',
    driverLabel: 'João',
    customerLabel: 'Mateus',
    routeLabel: 'São Luís → Imperatriz',
    ...overrides,
  };
}

function makeExpense(
  overrides: Partial<OperationalDreExpenseRow> = {},
): OperationalDreExpenseRow {
  return {
    id: 'expense-1',
    amount: 100,
    branchId: 'branch-1',
    customerId: null,
    tripId: 'trip-1',
    vehicleId: null,
    sourceModule: 'manual',
    categorySlug: 'combustivel',
    fuelRecordId: null,
    maintenanceRecordId: null,
    tireId: null,
    costCenterId: null,
    costCenterCode: null,
    costCenterName: null,
    ...overrides,
  };
}

describe('sumTripCosts / buildTripMetrics', () => {
  it('calculates revenue, costs, profit and margin per trip', () => {
    const trip = makeTripDetail({
      id: 't1',
      actualFreightValue: 4500,
      contractedFreightValue: 4000,
      distanceKm: 220,
    });
    const expenses = [
      makeExpense({id: 'e1', tripId: 't1', amount: 1200}),
      makeExpense({id: 'e2', tripId: 't1', amount: 980}),
      makeExpense({id: 'e3', tripId: 'other', amount: 999}),
    ];

    expect(sumTripCosts('t1', expenses)).toBe(2180);

    const metrics = buildTripMetrics(trip, expenses);
    expect(metrics.revenue).toBe(4500);
    expect(metrics.cost).toBe(2180);
    expect(metrics.profit).toBe(2320);
    expect(metrics.marginPercent).toBeCloseTo((2320 / 4500) * 100, 5);
    expect(metrics.tripNumber).toBe('VG-001');
    expect(metrics.vehicleLabel).toBe('ABC1234');
  });

  it('returns null margin when revenue is zero', () => {
    const metrics = buildTripMetrics(
      makeTrip({actualFreightValue: 0, contractedFreightValue: 0}),
      [makeExpense({amount: 50})],
    );
    expect(metrics.revenue).toBe(0);
    expect(metrics.profit).toBe(-50);
    expect(metrics.marginPercent).toBeNull();
  });
});

describe('calculateOperationalDreByRoute — grouping', () => {
  it('groups by route, sorts by highest cost, and leaves trips empty', () => {
    const trips = [
      makeTrip({
        id: 't1',
        routeId: 'route-a',
        actualFreightValue: 4500,
        distanceKm: 100,
      }),
      makeTrip({
        id: 't2',
        routeId: 'route-a',
        actualFreightValue: 5100,
        distanceKm: 120,
      }),
      makeTrip({
        id: 't3',
        routeId: 'route-b',
        actualFreightValue: 3000,
        distanceKm: 80,
      }),
      makeTrip({
        id: 't4',
        routeId: null,
        actualFreightValue: 1000,
        distanceKm: 40,
      }),
    ];
    const expenses = [
      makeExpense({id: 'e1', tripId: 't1', amount: 2180}),
      makeExpense({id: 'e2', tripId: 't2', amount: 2740}),
      makeExpense({id: 'e3', tripId: 't3', amount: 900}),
      makeExpense({id: 'e4', tripId: 't4', amount: 200}),
      makeExpense({id: 'e5', tripId: null, amount: 500}),
    ];
    const labels = new Map([
      ['route-a', 'São Luís → Imperatriz'],
      ['route-b', 'São Luís → Bacabal'],
    ]);

    const groups = calculateOperationalDreByRoute(trips, expenses, {}, labels);

    expect(groups).toHaveLength(3);
    expect(groups[0]?.route.label).toBe('São Luís → Imperatriz');
    expect(groups[0]?.tripCount).toBe(2);
    expect(groups[0]?.totalRevenue).toBe(9600);
    expect(groups[0]?.totalCost).toBe(4920);
    expect(groups[0]?.totalProfit).toBe(4680);
    expect(groups[0]?.totalKm).toBe(220);
    expect(groups[0]?.marginPercent).toBeCloseTo((4680 / 9600) * 100, 5);
    expect(groups[0]?.costPerKm).toBeCloseTo(4920 / 220, 5);
    expect(groups[0]?.revenuePerKm).toBeCloseTo(9600 / 220, 5);
    expect(groups[0]?.trips).toEqual([]);

    expect(groups[1]?.route.label).toBe('São Luís → Bacabal');
    expect(groups[1]?.totalCost).toBe(900);

    expect(groups[2]?.dimensionKey).toBe(OPERATIONAL_DRE_UNASSIGNED_DIMENSION_KEY);
    expect(groups[2]?.route.id).toBeNull();
    expect(groups[2]?.totalCost).toBe(200);
  });

  it('applies customer/route filters to expense scope', () => {
    const trips = [
      makeTrip({
        id: 't1',
        routeId: 'route-1',
        customerId: 'customer-1',
        actualFreightValue: 1000,
      }),
    ];
    const expenses = [
      makeExpense({id: 'e1', tripId: 't1', amount: 100}),
      makeExpense({id: 'e2', tripId: 'other', amount: 999}),
      makeExpense({
        id: 'e3',
        tripId: null,
        customerId: 'customer-1',
        amount: 50,
      }),
    ];

    const groups = calculateOperationalDreByRoute(
      trips,
      expenses,
      {customerId: 'customer-1', routeId: 'route-1'},
      new Map([['route-1', 'São Luís → Caxias']]),
    );

    // Com rota, despesa sem viagem fica de fora; custo = apenas e1.
    expect(groups).toHaveLength(1);
    expect(groups[0]?.totalRevenue).toBe(1000);
    expect(groups[0]?.totalCost).toBe(100);
    expect(groups[0]?.totalProfit).toBe(900);
  });
});

describe('calculateOperationalDreRouteTrips — expansion', () => {
  it('expands trips with per-trip metrics sorted by date', () => {
    const trips = [
      makeTripDetail({
        id: 't2',
        tripNumber: 'VG-002',
        completedAt: '2026-07-13T10:00:00.000Z',
        actualFreightValue: 5100,
      }),
      makeTripDetail({
        id: 't1',
        tripNumber: 'VG-001',
        completedAt: '2026-07-12T10:00:00.000Z',
        actualFreightValue: 4500,
      }),
    ];
    const expenses = [
      makeExpense({id: 'e1', tripId: 't1', amount: 2180}),
      makeExpense({id: 'e2', tripId: 't2', amount: 2740}),
    ];

    const details = calculateOperationalDreRouteTrips(trips, expenses, {});

    expect(details).toHaveLength(2);
    expect(details[0]?.tripNumber).toBe('VG-001');
    expect(details[0]?.revenue).toBe(4500);
    expect(details[0]?.cost).toBe(2180);
    expect(details[0]?.profit).toBe(2320);
    expect(details[1]?.tripNumber).toBe('VG-002');
    expect(details[1]?.profit).toBe(5100 - 2740);
  });

  it('allocates shared vehicle costs by mileage across trips', () => {
    const trips = [
      makeTripDetail({
        id: 'trip-a',
        vehicleId: 'vehicle-1',
        distanceKm: 200,
        actualFreightValue: 5000,
        tripNumber: 'VG-A',
        completedAt: '2026-07-10T10:00:00.000Z',
      }),
      makeTripDetail({
        id: 'trip-b',
        vehicleId: 'vehicle-1',
        distanceKm: 800,
        actualFreightValue: 8000,
        tripNumber: 'VG-B',
        completedAt: '2026-07-11T10:00:00.000Z',
      }),
    ];
    const expenses = [
      makeExpense({
        id: 'direct',
        tripId: 'trip-a',
        vehicleId: 'vehicle-1',
        amount: 100,
      }),
    ];
    const unlinked = [
      makeExpense({
        id: 'shared-fuel',
        tripId: null,
        vehicleId: 'vehicle-1',
        amount: 2000,
        categorySlug: 'combustivel',
      }),
    ];

    const details = calculateOperationalDreRouteTrips(trips, expenses, {}, {
      allocationBaseTrips: trips,
      unlinkedVehicleExpenses: unlinked,
    });

    const tripA = details.find((row) => row.id === 'trip-a');
    const tripB = details.find((row) => row.id === 'trip-b');

    expect(tripA?.cost).toBeCloseTo(500, 8); // 100 direct + 400 rateio
    expect(tripB?.cost).toBeCloseTo(1600, 8); // 1600 rateio
  });
});

describe('groupOperationalDreByDimension — future dimensions', () => {
  it('groups by customer using the same component contract', () => {
    const trips = [
      makeTrip({
        id: 't1',
        customerId: 'c1',
        actualFreightValue: 1000,
      }),
      makeTrip({
        id: 't2',
        customerId: 'c2',
        actualFreightValue: 2000,
      }),
    ];
    const expenses = [
      makeExpense({id: 'e1', tripId: 't1', amount: 400}),
      makeExpense({id: 'e2', tripId: 't2', amount: 100}),
    ];

    const groups = groupOperationalDreByDimension(trips, expenses, {}, {
      dimension: 'customer',
      labels: new Map([
        ['c1', 'Mateus'],
        ['c2', 'Nestlé'],
      ]),
      includeTrips: false,
    });

    expect(groups[0]?.label).toBe('Mateus');
    expect(groups[0]?.totalCost).toBe(400);
    expect(groups[1]?.label).toBe('Nestlé');
    expect(groups[1]?.totalCost).toBe(100);
  });
});
