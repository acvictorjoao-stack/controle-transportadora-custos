import {describe, expect, it} from 'vitest';

import {buildCustomerRankingRows} from '@/features/organization/dashboard/utils/rankings';

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
import {consolidatedRankingMarginPercent} from '../consolidated-ranking-margin';

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

describe('Audit #13 — consolidated ranking margin (weighted)', () => {
  it('two groups with very different revenues: consolidated is revenue-weighted, not simple average', () => {
    // Group A: revenue 1000, profit 500 → 50%
    // Group B: revenue 100000, profit 5000 → 5%
    // Simple avg = 27.5%; weighted = 5500/101000 ≈ 5.4455%
    const groups = [
      {totalRevenue: 1000, totalProfit: 500},
      {totalRevenue: 100_000, totalProfit: 5000},
    ];

    const simpleAverage =
      (groups[0].totalProfit / groups[0].totalRevenue +
        groups[1].totalProfit / groups[1].totalRevenue) *
      50;
    expect(simpleAverage).toBeCloseTo(27.5, 8);

    const consolidated = consolidatedRankingMarginPercent(groups);
    expect(consolidated).toBeCloseTo((5500 / 101_000) * 100, 8);
    expect(consolidated).not.toBeCloseTo(27.5, 1);
  });

  it('all groups with the same margin: consolidated equals individual margin', () => {
    const groups = [
      {totalRevenue: 1000, totalProfit: 200},
      {totalRevenue: 50_000, totalProfit: 10_000},
      {totalRevenue: 250, totalProfit: 50},
    ];

    expect(consolidatedRankingMarginPercent(groups)).toBeCloseTo(20, 8);
  });

  it('group with zero revenue does not distort consolidated margin', () => {
    const groups = [
      {totalRevenue: 10_000, totalProfit: 2000}, // 20%
      {totalRevenue: 0, totalProfit: -500}, // would distort if included
    ];

    expect(consolidatedRankingMarginPercent(groups)).toBeCloseTo(20, 8);
  });

  it('total revenue zero returns 0 safely (no Infinity/NaN)', () => {
    expect(consolidatedRankingMarginPercent([])).toBe(0);
    expect(
      consolidatedRankingMarginPercent([
        {totalRevenue: 0, totalProfit: 0},
        {totalRevenue: 0, totalProfit: -100},
      ]),
    ).toBe(0);
    expect(
      consolidatedRankingMarginPercent([{totalRevenue: 100, totalProfit: null}]),
    ).toBe(0);

    const result = consolidatedRankingMarginPercent([
      {totalRevenue: 0, totalProfit: 0},
    ]);
    expect(Number.isFinite(result)).toBe(true);
    expect(Number.isNaN(result)).toBe(false);
  });

  it.each([
    {
      name: 'route',
      calculate: calculateOperationalDreByRoute,
      labels: new Map([['route-a', 'Rota A'], ['route-b', 'Rota B']]),
      tripA: {routeId: 'route-a', customerId: 'c1'},
      tripB: {routeId: 'route-b', customerId: 'c2'},
    },
    {
      name: 'customer',
      calculate: calculateOperationalDreByCustomer,
      labels: new Map([['cust-a', 'Cliente A'], ['cust-b', 'Cliente B']]),
      tripA: {customerId: 'cust-a', routeId: 'r1'},
      tripB: {customerId: 'cust-b', routeId: 'r2'},
    },
    {
      name: 'vehicle',
      calculate: calculateOperationalDreByVehicle,
      labels: new Map([['veh-a', 'Veículo A'], ['veh-b', 'Veículo B']]),
      tripA: {vehicleId: 'veh-a', customerId: 'c1'},
      tripB: {vehicleId: 'veh-b', customerId: 'c2'},
    },
    {
      name: 'driver',
      calculate: calculateOperationalDreByDriver,
      labels: new Map([['drv-a', 'Motorista A'], ['drv-b', 'Motorista B']]),
      tripA: {driverId: 'drv-a', customerId: 'c1'},
      tripB: {driverId: 'drv-b', customerId: 'c2'},
    },
  ] as const)(
    'weighted margin works for $name ranking groups',
    ({calculate, labels, tripA, tripB}) => {
      // A: revenue 1000, cost 500 → 50%
      // B: revenue 100000, cost 95000 → 5%
      const trips = [
        trip({
          id: 't-a',
          actualFreightValue: 1000,
          contractedFreightValue: 1000,
          distanceKm: 10,
          ...tripA,
        }),
        trip({
          id: 't-b',
          actualFreightValue: 100_000,
          contractedFreightValue: 100_000,
          distanceKm: 90,
          ...tripB,
        }),
      ];
      const expenses = [
        expense({
          id: 'e-a',
          amount: 500,
          tripId: 't-a',
          vehicleId: trips[0].vehicleId,
        }),
        expense({
          id: 'e-b',
          amount: 95_000,
          tripId: 't-b',
          vehicleId: trips[1].vehicleId,
        }),
      ];

      const groups = calculate(trips, expenses, {}, labels);
      const consolidated = consolidatedRankingMarginPercent(groups);

      const totalRevenue = groups.reduce((s, g) => s + g.totalRevenue, 0);
      const totalProfit = groups.reduce(
        (s, g) => s + (g.totalProfit ?? 0),
        0,
      );
      expect(totalRevenue).toBeCloseTo(101_000, 8);
      expect(consolidated).toBeCloseTo((totalProfit / totalRevenue) * 100, 8);
      expect(consolidated).toBeCloseTo((5500 / 101_000) * 100, 8);

      const simpleAvg =
        groups
          .filter((g) => g.marginPercent != null)
          .reduce((s, g) => s + (g.marginPercent ?? 0), 0) /
        groups.filter((g) => g.marginPercent != null).length;
      expect(simpleAvg).toBeCloseTo(27.5, 1);
      expect(consolidated).not.toBeCloseTo(simpleAvg, 1);
    },
  );

  it('Audit #12 intact: attributed costs stay in ranking; unattributable stay out of rateio', () => {
    const trips = [trip({id: 't1', distanceKm: 100})];
    const expenses = [
      expense({id: 'fuel', amount: 400, tripId: 't1', vehicleId: 'vehicle-1'}),
      expense({id: 'payroll', amount: 600, tripId: null, vehicleId: null}),
    ];

    const dre = calculateOperationalDre(trips, expenses);
    expect(dre.costs.totalOperatingCosts).toBe(1000);
    expect(dre.costs.allocatedOperatingCosts).toBe(400);
    expect(dre.costs.unattributableOperatingCosts).toBe(600);

    const groups = calculateOperationalDreByCustomer(
      trips,
      expenses,
      {},
      new Map([['customer-1', 'Cliente 1']]),
    );
    const ranking = buildCustomerRankingRows(groups);
    const rankingCostSum = ranking.reduce((sum, row) => sum + row.costs, 0);
    expect(rankingCostSum).toBeCloseTo(dre.costs.allocatedOperatingCosts, 8);
    expect(rankingCostSum).not.toBe(dre.costs.totalOperatingCosts);

    // Margem consolidada do ranking usa lucro/receita da base atribuída
    const consolidated = consolidatedRankingMarginPercent(groups);
    expect(consolidated).toBeCloseTo(
      ((groups[0].totalProfit ?? 0) / groups[0].totalRevenue) * 100,
      8,
    );
    // Não usa o lucro DRE que inclui não atribuíveis (1000 - 1000 = 0 → 0%)
    expect(dre.result.operatingProfit).toBe(0);
    expect(consolidated).not.toBe(0);
    expect(consolidated).toBeCloseTo(60, 8); // (1000-400)/1000
  });
});
