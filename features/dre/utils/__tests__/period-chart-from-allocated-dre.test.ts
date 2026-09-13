import {describe, expect, it} from 'vitest';

import {
  buildCustomerRankingRows,
  buildDriverRankingRows,
  buildRouteRankingRows,
  buildVehicleRankingRows,
} from '@/features/organization/dashboard/utils/rankings';

import {calculateOperationalDre} from '../../services/operational-dre-calculator';
import {
  calculateOperationalDreByCustomer,
  calculateOperationalDreByDriver,
  calculateOperationalDreByRoute,
  calculateOperationalDreByVehicle,
} from '../../services/operational-dre-by-dimension';
import type {
  OperationalDreExpenseRow,
  OperationalDreTripRow,
} from '../../types';
import {buildAllocatedPeriodChartPoint} from '../period-chart-from-allocated-dre';

function trip(
  overrides: Partial<OperationalDreTripRow> & {id: string},
): OperationalDreTripRow {
  return {
    branchId: null,
    customerId: 'customer-1',
    routeId: 'route-1',
    vehicleId: 'vehicle-1',
    driverId: 'driver-1',
    contractedFreightValue: 1000,
    actualFreightValue: 1000,
    distanceKm: 100,
    ...overrides,
  };
}

function expense(
  overrides: Partial<OperationalDreExpenseRow> & {id: string; amount: number},
): OperationalDreExpenseRow {
  return {
    tripId: null,
    vehicleId: null,
    driverId: null,
    branchId: null,
    customerId: null,
    costCenterId: null,
    costCenterCode: null,
    costCenterName: null,
    categorySlug: null,
    fuelRecordId: null,
    maintenanceRecordId: null,
    tireId: null,
    sourceModule: null,
    ...overrides,
  };
}

describe('Audit #14 — period chart uses allocated ranking base', () => {
  it('chart costs/profit use allocatedOperatingCosts, not total DRE', () => {
    const trips = [trip({id: 't1'})];
    const expenses = [
      expense({id: 'fuel', amount: 400, tripId: 't1', vehicleId: 'vehicle-1'}),
      expense({id: 'payroll', amount: 600, tripId: null, vehicleId: null}),
    ];
    const dre = calculateOperationalDre(trips, expenses);

    expect(dre.costs.totalOperatingCosts).toBe(1000);
    expect(dre.costs.allocatedOperatingCosts).toBe(400);
    expect(dre.result.operatingProfit).toBe(0); // 1000 - 1000

    const point = buildAllocatedPeriodChartPoint(
      {key: '2026-01', label: 'Jan/26'},
      dre,
    );

    expect(point.revenue).toBe(1000);
    expect(point.costs).toBe(400);
    expect(point.costs).not.toBe(dre.costs.totalOperatingCosts);
    expect(point.profit).toBe(600); // 1000 - 400
    expect(point.profit).not.toBe(dre.result.operatingProfit);
  });

  it('direct trip expense appears in both ranking and chart series', () => {
    const trips = [trip({id: 't1', actualFreightValue: 2000})];
    const expenses = [
      expense({id: 'direct', amount: 300, tripId: 't1', vehicleId: 'vehicle-1'}),
    ];
    const dre = calculateOperationalDre(trips, expenses);
    const groups = calculateOperationalDreByCustomer(
      trips,
      expenses,
      {},
      new Map([['customer-1', 'Cliente 1']]),
    );
    const rankingCost = buildCustomerRankingRows(groups).reduce(
      (s, r) => s + r.costs,
      0,
    );
    const point = buildAllocatedPeriodChartPoint(
      {key: '2026-02', label: 'Fev/26'},
      dre,
    );

    expect(rankingCost).toBe(300);
    expect(point.costs).toBe(300);
    expect(point.costs).toBe(dre.costs.allocatedOperatingCosts);
    expect(point.profit).toBe(1700);
  });

  it('KM-rateado expense appears with same allocation as ranking', () => {
    const trips = [
      trip({id: 't1', distanceKm: 25, actualFreightValue: 500}),
      trip({id: 't2', distanceKm: 75, actualFreightValue: 1500}),
    ];
    const expenses = [
      expense({
        id: 'shared',
        amount: 200,
        tripId: null,
        vehicleId: 'vehicle-1',
      }),
    ];
    const dre = calculateOperationalDre(trips, expenses);
    const groups = calculateOperationalDreByVehicle(
      trips,
      expenses,
      {},
      new Map([['vehicle-1', 'Veículo 1']]),
    );
    const rankingCost = buildVehicleRankingRows(groups).reduce(
      (s, r) => s + r.costs,
      0,
    );
    const point = buildAllocatedPeriodChartPoint(
      {key: '2026-03', label: 'Mar/26'},
      dre,
    );

    expect(dre.costs.allocatedOperatingCosts).toBe(200);
    expect(rankingCost).toBeCloseTo(200, 8);
    expect(point.costs).toBeCloseTo(200, 8);
    expect(point.profit).toBeCloseTo(1800, 8);
  });

  it('unattributable expense stays out of ranking and allocated chart series', () => {
    const trips = [trip({id: 't1'})];
    const expenses = [
      expense({id: 'fuel', amount: 100, tripId: 't1', vehicleId: 'vehicle-1'}),
      expense({id: 'admin', amount: 900, tripId: null, vehicleId: null}),
    ];
    const dre = calculateOperationalDre(trips, expenses);
    const groups = calculateOperationalDreByRoute(
      trips,
      expenses,
      {},
      new Map([['route-1', 'Rota 1']]),
    );
    const rankingCost = buildRouteRankingRows(groups).reduce(
      (s, r) => s + r.costs,
      0,
    );
    const point = buildAllocatedPeriodChartPoint(
      {key: '2026-04', label: 'Abr/26'},
      dre,
    );

    expect(dre.costs.unattributableOperatingCosts).toBe(900);
    expect(rankingCost).toBe(100);
    expect(point.costs).toBe(100);
    expect(point.costs + dre.costs.unattributableOperatingCosts).toBe(
      dre.costs.totalOperatingCosts,
    );
    // Não contamina silenciosamente a série atribuída
    expect(point.costs).not.toBe(dre.costs.totalOperatingCosts);
  });

  it('two periods keep independent allocation (no cross-contamination)', () => {
    const periodA = {
      trips: [trip({id: 'a1', actualFreightValue: 1000})],
      expenses: [
        expense({id: 'a-fuel', amount: 200, tripId: 'a1', vehicleId: 'vehicle-1'}),
        expense({id: 'a-admin', amount: 500, tripId: null, vehicleId: null}),
      ],
    };
    const periodB = {
      trips: [trip({id: 'b1', actualFreightValue: 2000})],
      expenses: [
        expense({id: 'b-fuel', amount: 800, tripId: 'b1', vehicleId: 'vehicle-1'}),
      ],
    };

    const dreA = calculateOperationalDre(periodA.trips, periodA.expenses);
    const dreB = calculateOperationalDre(periodB.trips, periodB.expenses);
    const pointA = buildAllocatedPeriodChartPoint(
      {key: '2026-01', label: 'Jan'},
      dreA,
    );
    const pointB = buildAllocatedPeriodChartPoint(
      {key: '2026-02', label: 'Fev'},
      dreB,
    );

    expect(pointA.costs).toBe(200);
    expect(pointA.profit).toBe(800);
    expect(pointB.costs).toBe(800);
    expect(pointB.profit).toBe(1200);
    expect(pointA.costs).not.toBe(pointB.costs);
  });

  it.each([
    {
      name: 'customer',
      calculate: calculateOperationalDreByCustomer,
      buildRanking: buildCustomerRankingRows,
      labels: new Map([['customer-1', 'Cliente 1']]),
    },
    {
      name: 'route',
      calculate: calculateOperationalDreByRoute,
      buildRanking: buildRouteRankingRows,
      labels: new Map([['route-1', 'Rota 1']]),
    },
    {
      name: 'vehicle',
      calculate: calculateOperationalDreByVehicle,
      buildRanking: buildVehicleRankingRows,
      labels: new Map([['vehicle-1', 'Veículo 1']]),
    },
    {
      name: 'driver',
      calculate: calculateOperationalDreByDriver,
      buildRanking: buildDriverRankingRows,
      labels: new Map([['driver-1', 'Motorista 1']]),
    },
  ] as const)(
    'chart series matches $name ranking allocated cost base',
    ({calculate, buildRanking, labels}) => {
      const trips = [
        trip({id: 't1', distanceKm: 40}),
        trip({id: 't2', distanceKm: 60}),
      ];
      const expenses = [
        expense({id: 'direct', amount: 100, tripId: 't1', vehicleId: 'vehicle-1'}),
        expense({
          id: 'shared',
          amount: 200,
          tripId: null,
          vehicleId: 'vehicle-1',
        }),
        expense({id: 'orphan', amount: 50, tripId: null, vehicleId: null}),
      ];

      const dre = calculateOperationalDre(trips, expenses);
      const groups = calculate(trips, expenses, {}, labels);
      const rankingCostSum = buildRanking(groups).reduce(
        (sum, row) => sum + row.costs,
        0,
      );
      const point = buildAllocatedPeriodChartPoint(
        {key: 'bucket', label: 'Bucket'},
        dre,
      );

      expect(point.costs).toBeCloseTo(dre.costs.allocatedOperatingCosts, 8);
      expect(point.costs).toBeCloseTo(rankingCostSum, 8);
      expect(point.revenue).toBe(dre.revenues.totalRevenue);
      expect(point.profit).toBeCloseTo(point.revenue - point.costs, 8);
      expect(dre.costs.unattributableOperatingCosts).toBe(50);
      expect(
        dre.costs.allocatedOperatingCosts + dre.costs.unattributableOperatingCosts,
      ).toBe(dre.costs.totalOperatingCosts);
    },
  );

  it('costs-only mode keeps profit null on chart point', () => {
    const trips = [trip({id: 't1'})];
    const expenses = [
      expense({id: 'fuel', amount: 100, tripId: 't1', vehicleId: 'vehicle-1'}),
    ];
    const dre = calculateOperationalDre(trips, expenses, {
      costCenterId: 'cc-1',
    });
    expect(dre.costsOnlyMode).toBe(true);

    const point = buildAllocatedPeriodChartPoint(
      {key: '2026-05', label: 'Mai'},
      dre,
    );
    expect(point.profit).toBeNull();
    expect(point.costs).toBe(dre.costs.allocatedOperatingCosts);
  });

  it('Audit #12 regression: allocated/unattributable splits remain intact', () => {
    const trips = [trip({id: 't1'})];
    const expenses = [
      expense({id: 'fuel', amount: 400, tripId: 't1', vehicleId: 'vehicle-1'}),
      expense({id: 'payroll', amount: 600, tripId: null, vehicleId: null}),
    ];
    const dre = calculateOperationalDre(trips, expenses);

    expect(dre.costs.allocatedOperatingCosts).toBe(400);
    expect(dre.costs.unattributableOperatingCosts).toBe(600);
    expect(
      dre.costs.allocatedOperatingCosts + dre.costs.unattributableOperatingCosts,
    ).toBe(dre.costs.totalOperatingCosts);

    const point = buildAllocatedPeriodChartPoint(
      {key: 'x', label: 'X'},
      dre,
    );
    expect(point.costs).toBe(400);
    // DRE empresarial permanece com total (não transformada em ranking)
    expect(dre.costs.totalOperatingCosts).toBe(1000);
    expect(dre.result.operatingProfit).toBe(0);
  });

  it('never double-counts allocated amounts in chart series', () => {
    const trips = [
      trip({id: 't1', distanceKm: 25}),
      trip({id: 't2', distanceKm: 75}),
    ];
    const expenses = [
      expense({id: 'direct', amount: 100, tripId: 't1', vehicleId: 'vehicle-1'}),
      expense({id: 'shared', amount: 200, tripId: null, vehicleId: 'vehicle-1'}),
      expense({id: 'orphan', amount: 50, tripId: null, vehicleId: null}),
    ];
    const dre = calculateOperationalDre(trips, expenses);
    const point = buildAllocatedPeriodChartPoint(
      {key: 'y', label: 'Y'},
      dre,
    );

    expect(point.costs).toBe(300);
    expect(point.costs).toBe(dre.costs.allocatedOperatingCosts);
    expect(point.costs).not.toBe(
      dre.costs.allocatedOperatingCosts + dre.costs.unattributableOperatingCosts,
    );
  });
});
