import {describe, expect, it} from 'vitest';

import {calculateOperationalDre} from '../operational-dre-calculator';
import type {
  OperationalDreExpenseRow,
  OperationalDreTripRow,
} from '../../types';
import {buildCustomerRankingRows} from '@/features/organization/dashboard/utils/rankings';
import {calculateOperationalDreByCustomer} from '../operational-dre-by-dimension';

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

describe('Audit #12 — DRE cost allocation vs profitability ranking', () => {
  it('all attributable: total = allocated, unattributable = 0, ranking sums allocated', () => {
    const trips = [
      trip({id: 't1', distanceKm: 40}),
      trip({id: 't2', distanceKm: 60}),
    ];
    const expenses = [
      expense({id: 'e1', amount: 200, tripId: 't1', vehicleId: 'vehicle-1'}),
      expense({id: 'e2', amount: 300, tripId: null, vehicleId: 'vehicle-1'}),
    ];

    const dre = calculateOperationalDre(trips, expenses);
    expect(dre.costs.totalOperatingCosts).toBe(500);
    expect(dre.costs.allocatedOperatingCosts).toBe(500);
    expect(dre.costs.unattributableOperatingCosts).toBe(0);
    expect(
      dre.costs.allocatedOperatingCosts + dre.costs.unattributableOperatingCosts,
    ).toBe(dre.costs.totalOperatingCosts);

    const groups = calculateOperationalDreByCustomer(trips, expenses, {}, new Map([
      ['customer-1', 'Cliente 1'],
    ]));
    const ranking = buildCustomerRankingRows(groups);
    const rankingCostSum = ranking.reduce((sum, row) => sum + row.costs, 0);
    expect(rankingCostSum).toBeCloseTo(dre.costs.allocatedOperatingCosts, 8);
  });

  it('mixed: DRE keeps full total; ranking only allocated; unattributable explicit', () => {
    const trips = [trip({id: 't1', distanceKm: 100})];
    const expenses = [
      expense({id: 'fuel', amount: 400, tripId: 't1', vehicleId: 'vehicle-1'}),
      expense({id: 'payroll', amount: 600, tripId: null, vehicleId: null}),
    ];

    const dre = calculateOperationalDre(trips, expenses);
    expect(dre.costs.totalOperatingCosts).toBe(1000);
    expect(dre.costs.allocatedOperatingCosts).toBe(400);
    expect(dre.costs.unattributableOperatingCosts).toBe(600);

    const groups = calculateOperationalDreByCustomer(trips, expenses, {}, new Map([
      ['customer-1', 'Cliente 1'],
    ]));
    const ranking = buildCustomerRankingRows(groups);
    const rankingCostSum = ranking.reduce((sum, row) => sum + row.costs, 0);
    expect(rankingCostSum).toBe(400);
    expect(rankingCostSum).toBe(dre.costs.allocatedOperatingCosts);
    expect(rankingCostSum + dre.costs.unattributableOperatingCosts).toBe(
      dre.costs.totalOperatingCosts,
    );
  });

  it('100% unattributable: DRE shows cost; ranking invents no allocation', () => {
    const trips = [trip({id: 't1', distanceKm: 100})];
    const expenses = [
      expense({id: 'admin', amount: 850, tripId: null, vehicleId: null}),
    ];

    const dre = calculateOperationalDre(trips, expenses);
    expect(dre.costs.totalOperatingCosts).toBe(850);
    expect(dre.costs.allocatedOperatingCosts).toBe(0);
    expect(dre.costs.unattributableOperatingCosts).toBe(850);

    const groups = calculateOperationalDreByCustomer(trips, expenses, {}, new Map([
      ['customer-1', 'Cliente 1'],
    ]));
    const ranking = buildCustomerRankingRows(groups);
    const rankingCostSum = ranking.reduce((sum, row) => sum + row.costs, 0);
    expect(rankingCostSum).toBe(0);
  });

  it('never double-counts: allocated amounts are absent from unattributable', () => {
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
    expect(dre.costs.allocatedOperatingCosts).toBe(300);
    expect(dre.costs.unattributableOperatingCosts).toBe(50);
    expect(
      dre.costs.allocatedOperatingCosts + dre.costs.unattributableOperatingCosts,
    ).toBe(dre.costs.totalOperatingCosts);
  });

  it('zero/null amounts stay consistent with existing contracts', () => {
    const dre = calculateOperationalDre([], []);
    expect(dre.costs.totalOperatingCosts).toBe(0);
    expect(dre.costs.allocatedOperatingCosts).toBe(0);
    expect(dre.costs.unattributableOperatingCosts).toBe(0);

    const withZero = calculateOperationalDre(
      [trip({id: 't1'})],
      [expense({id: 'z', amount: 0, tripId: null, vehicleId: null})],
    );
    expect(withZero.costs.totalOperatingCosts).toBe(0);
    expect(withZero.costs.allocatedOperatingCosts).toBe(0);
    expect(withZero.costs.unattributableOperatingCosts).toBe(0);
  });
});
