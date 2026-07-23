import {describe, expect, it} from 'vitest';

import {
  aggregateCosts,
  aggregateCostsByCostCenter,
  buildIndicators,
  calculateOperationalDre,
  categorizeExpense,
  expenseMatchesScope,
  filterExpensesForScope,
  sumFreightRevenue,
} from '../operational-dre-calculator';
import type {OperationalDreExpenseRow, OperationalDreTripRow} from '../../types';

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

function makeExpense(
  overrides: Partial<OperationalDreExpenseRow> = {},
): OperationalDreExpenseRow {
  return {
    id: 'expense-1',
    amount: 100,
    branchId: 'branch-1',
    customerId: null,
    tripId: 'trip-1',
    sourceModule: 'manual',
    categorySlug: null,
    fuelRecordId: null,
    maintenanceRecordId: null,
    tireId: null,
    costCenterId: null,
    costCenterCode: null,
    costCenterName: null,
    ...overrides,
  };
}

describe('categorizeExpense', () => {
  it('prioritizes fuel by slug or fuel_record_id', () => {
    expect(categorizeExpense(makeExpense({categorySlug: 'combustivel'}))).toBe(
      'fuel',
    );
    expect(
      categorizeExpense(
        makeExpense({categorySlug: 'outros', fuelRecordId: 'fuel-1'}),
      ),
    ).toBe('fuel');
  });

  it('classifies accounts payable and financial sources', () => {
    expect(
      categorizeExpense(makeExpense({sourceModule: 'accounts_payable'})),
    ).toBe('accountsPayable');
    expect(categorizeExpense(makeExpense({sourceModule: 'financeiro'}))).toBe(
      'financial',
    );
    expect(categorizeExpense(makeExpense({categorySlug: 'impostos'}))).toBe(
      'financial',
    );
  });
});

describe('sumFreightRevenue', () => {
  it('prefers actual freight over contracted', () => {
    const total = sumFreightRevenue([
      makeTrip({actualFreightValue: 1200, contractedFreightValue: 1000}),
      makeTrip({id: 'trip-2', actualFreightValue: null, contractedFreightValue: 800}),
    ]);
    expect(total).toBe(2000);
  });
});

describe('aggregateCosts', () => {
  it('sums exclusive buckets without double counting', () => {
    const costs = aggregateCosts([
      makeExpense({id: '1', amount: 200, categorySlug: 'combustivel'}),
      makeExpense({id: '2', amount: 150, categorySlug: 'manutencao'}),
      makeExpense({id: '3', amount: 50, tireId: 'tire-1'}),
      makeExpense({id: '4', amount: 80, sourceModule: 'financeiro'}),
      makeExpense({id: '5', amount: 40, sourceModule: 'accounts_payable'}),
      makeExpense({id: '6', amount: 30, categorySlug: 'outros', sourceModule: 'trips'}),
    ]);

    expect(costs.fuel).toBe(200);
    expect(costs.maintenance).toBe(150);
    expect(costs.tires).toBe(50);
    expect(costs.financial).toBe(80);
    expect(costs.accountsPayable).toBe(40);
    expect(costs.other).toBe(30);
    expect(costs.totalOperatingCosts).toBe(550);
  });
});

describe('buildIndicators', () => {
  it('returns null ratios when km or trips are zero', () => {
    const indicators = buildIndicators({
      totalRevenue: 1000,
      totalOperatingCosts: 400,
      operatingProfit: 600,
      tripCount: 0,
      totalKm: 0,
      customersServed: 0,
      routesUsed: 0,
      vehiclesUsed: 0,
    });

    expect(indicators.revenuePerKm).toBeNull();
    expect(indicators.costPerKm).toBeNull();
    expect(indicators.profitPerKm).toBeNull();
    expect(indicators.revenuePerTrip).toBeNull();
    expect(indicators.costPerTrip).toBeNull();
    expect(indicators.profitPerTrip).toBeNull();
  });

  it('computes per-km and per-trip ratios', () => {
    const indicators = buildIndicators({
      totalRevenue: 1000,
      totalOperatingCosts: 400,
      operatingProfit: 600,
      tripCount: 2,
      totalKm: 100,
      customersServed: 1,
      routesUsed: 1,
      vehiclesUsed: 1,
    });

    expect(indicators.revenuePerKm).toBe(10);
    expect(indicators.costPerKm).toBe(4);
    expect(indicators.profitPerKm).toBe(6);
    expect(indicators.revenuePerTrip).toBe(500);
    expect(indicators.costPerTrip).toBe(200);
    expect(indicators.profitPerTrip).toBe(300);
  });
});

describe('calculateOperationalDre', () => {
  it('computes total revenue, costs, profit and margin', () => {
    const dre = calculateOperationalDre(
      [
        makeTrip({id: 't1', actualFreightValue: 1000, distanceKm: 50}),
        makeTrip({
          id: 't2',
          actualFreightValue: 500,
          distanceKm: 50,
          customerId: 'customer-2',
          routeId: 'route-2',
          vehicleId: 'vehicle-2',
        }),
      ],
      [
        makeExpense({id: 'e1', amount: 300, categorySlug: 'combustivel', tripId: 't1'}),
        makeExpense({id: 'e2', amount: 200, categorySlug: 'manutencao', tripId: 't2'}),
      ],
    );

    expect(dre.revenues.totalRevenue).toBe(1500);
    expect(dre.costs.totalOperatingCosts).toBe(500);
    expect(dre.result.operatingProfit).toBe(1000);
    expect(dre.result.operatingMarginPercent).toBeCloseTo(66.666, 2);
    expect(dre.indicators.revenuePerKm).toBe(15);
    expect(dre.indicators.costPerKm).toBe(5);
    expect(dre.indicators.profitPerKm).toBe(10);
    expect(dre.indicators.revenuePerTrip).toBe(750);
    expect(dre.indicators.costPerTrip).toBe(250);
    expect(dre.indicators.tripCount).toBe(2);
    expect(dre.indicators.customersServed).toBe(2);
    expect(dre.indicators.routesUsed).toBe(2);
    expect(dre.indicators.vehiclesUsed).toBe(2);
  });

  it('applies customer and route filters to expense scope', () => {
    const trips = [
      makeTrip({id: 't1', customerId: 'customer-1', routeId: 'route-1'}),
    ];
    const expenses = [
      makeExpense({id: 'e1', amount: 100, tripId: 't1', categorySlug: 'combustivel'}),
      makeExpense({
        id: 'e2',
        amount: 999,
        tripId: 'other-trip',
        categorySlug: 'combustivel',
      }),
      makeExpense({
        id: 'e3',
        amount: 50,
        tripId: null,
        customerId: 'customer-1',
        sourceModule: 'accounts_payable',
      }),
    ];

    const scopedByCustomer = filterExpensesForScope(
      expenses,
      {customerId: 'customer-1'},
      trips,
    );
    expect(scopedByCustomer.map((row) => row.id)).toEqual(['e1', 'e3']);

    expect(
      expenseMatchesScope(expenses[1], {routeId: 'route-1'}, new Set(['t1'])),
    ).toBe(false);

    // Com rota, despesa sem viagem (e3) fica de fora.
    const dre = calculateOperationalDre(trips, expenses, {
      customerId: 'customer-1',
      routeId: 'route-1',
    });
    expect(dre.costs.fuel).toBe(100);
    expect(dre.costs.accountsPayable).toBe(0);
    expect(dre.costs.totalOperatingCosts).toBe(100);
  });

  it('keeps unscoped expenses when no customer/route filter is set', () => {
    const dre = calculateOperationalDre(
      [makeTrip()],
      [
        makeExpense({
          id: 'e1',
          amount: 10,
          tripId: null,
          categorySlug: 'outros',
          sourceModule: 'trips',
        }),
        makeExpense({
          id: 'e2',
          amount: 20,
          tripId: 'unrelated',
          categorySlug: 'outros',
          sourceModule: 'trips',
        }),
      ],
      {branchId: 'branch-1'},
    );

    expect(dre.costs.other).toBe(30);
  });
});

describe('aggregateCostsByCostCenter', () => {
  it('builds ranking with participation percent', () => {
    const breakdown = aggregateCostsByCostCenter([
      makeExpense({
        id: '1',
        amount: 720,
        costCenterId: 'cc-op',
        costCenterCode: 'OPERACIONAL',
        costCenterName: 'Operacional',
      }),
      makeExpense({
        id: '2',
        amount: 140,
        costCenterId: 'cc-adm',
        costCenterCode: 'ADMINISTRATIVO',
        costCenterName: 'Administrativo',
      }),
      makeExpense({
        id: '3',
        amount: 80,
        costCenterId: 'cc-com',
        costCenterCode: 'COMERCIAL',
        costCenterName: 'Comercial',
      }),
      makeExpense({
        id: '4',
        amount: 40,
        costCenterId: 'cc-rh',
        costCenterCode: 'RH',
        costCenterName: 'RH',
      }),
      makeExpense({
        id: '5',
        amount: 20,
        costCenterId: 'cc-ti',
        costCenterCode: 'TI',
        costCenterName: 'TI',
      }),
    ]);

    expect(breakdown.total).toBe(1000);
    expect(breakdown.byCode.OPERACIONAL).toBe(720);
    expect(breakdown.ranking[0]?.code).toBe('OPERACIONAL');
    expect(breakdown.ranking[0]?.percent).toBe(72);
    expect(breakdown.ranking.find((row) => row.code === 'TI')?.percent).toBe(2);
  });
});
