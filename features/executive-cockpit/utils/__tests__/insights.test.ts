import {describe, expect, it} from 'vitest';

import type {
  OperationalDreCustomerGroup,
  OperationalDreData,
  OperationalDreRouteGroup,
  OperationalDreVehicleGroup,
} from '@/features/dre/types';

import {buildExecutiveInsights} from '../insights';

function emptyDre(overrides: Partial<OperationalDreData> = {}): OperationalDreData {
  return {
    revenues: {freightRevenue: 1000, totalRevenue: 1000},
    costs: {
      fuel: 200,
      maintenance: 100,
      tires: 0,
      financial: 0,
      accountsPayable: 0,
      other: 0,
      totalOperatingCosts: 300,
    },
    result: {operatingProfit: 700, operatingMarginPercent: 70},
    indicators: {
      revenuePerKm: 10,
      costPerKm: 3,
      profitPerKm: 7,
      revenuePerTrip: 100,
      costPerTrip: 30,
      profitPerTrip: 70,
      tripCount: 10,
      totalKm: 100,
      customersServed: 1,
      routesUsed: 1,
      vehiclesUsed: 1,
    },
    analyticalTable: [],
    costCenterBreakdown: {byCode: {}, ranking: [], total: 0},
    filters: {},
    ...overrides,
  };
}

function route(
  overrides: Partial<OperationalDreRouteGroup> & {label: string; key: string},
): OperationalDreRouteGroup {
  return {
    dimensionKey: overrides.key,
    dimensionType: 'route',
    label: overrides.label,
    tripCount: 5,
    totalRevenue: 1000,
    totalCost: 800,
    totalProfit: 200,
    marginPercent: 20,
    totalKm: 100,
    costPerKm: 8,
    revenuePerKm: 10,
    trips: [],
    route: {id: overrides.key, label: overrides.label},
    ...overrides,
  };
}

describe('buildExecutiveInsights', () => {
  it('flags route margin drop with cost drivers', () => {
    const insights = buildExecutiveInsights({
      dre: emptyDre({
        costs: {
          fuel: 300,
          maintenance: 150,
          tires: 0,
          financial: 0,
          accountsPayable: 0,
          other: 0,
          totalOperatingCosts: 450,
        },
      }),
      previousDre: emptyDre(),
      routes: [
        route({
          key: 'r1',
          label: 'São Luís → Imperatriz',
          marginPercent: 8,
          totalCost: 900,
        }),
      ],
      previousRoutes: [
        route({
          key: 'r1',
          label: 'São Luís → Imperatriz',
          marginPercent: 20,
          totalCost: 700,
        }),
      ],
      customers: [],
      previousCustomers: [],
      vehicles: [],
    });

    expect(insights[0]?.title).toContain('São Luís → Imperatriz');
    expect(insights[0]?.title).toContain('12%');
    expect(insights[0]?.cause).toContain('combustível');
  });

  it('flags customer revenue up with lagging profit', () => {
    const customer = (
      key: string,
      revenue: number,
      profit: number,
    ): OperationalDreCustomerGroup => ({
      dimensionKey: key,
      dimensionType: 'customer',
      label: 'Cliente XP',
      tripCount: 3,
      totalRevenue: revenue,
      totalCost: revenue - profit,
      totalProfit: profit,
      marginPercent: (profit / revenue) * 100,
      totalKm: 50,
      costPerKm: 1,
      revenuePerKm: 2,
      trips: [],
      customer: {id: key, label: 'Cliente XP'},
    });

    const insights = buildExecutiveInsights({
      dre: emptyDre(),
      previousDre: emptyDre(),
      routes: [],
      previousRoutes: [],
      customers: [customer('c1', 1180, 102)],
      previousCustomers: [customer('c1', 1000, 100)],
      vehicles: [],
    });

    expect(insights.some((item) => item.title.includes('Cliente XP'))).toBe(true);
    expect(
      insights.some((item) => item.suggestion?.includes('preço do frete')),
    ).toBe(true);
  });

  it('flags vehicle cost/km above fleet average', () => {
    const vehicle = (
      key: string,
      label: string,
      costPerKm: number,
    ): OperationalDreVehicleGroup => ({
      dimensionKey: key,
      dimensionType: 'vehicle',
      label,
      tripCount: 2,
      totalRevenue: 500,
      totalCost: costPerKm * 100,
      totalProfit: 100,
      marginPercent: 20,
      totalKm: 100,
      costPerKm,
      revenuePerKm: 5,
      trips: [],
      vehicle: {id: key, label},
    });

    const insights = buildExecutiveInsights({
      dre: emptyDre(),
      routes: [],
      previousRoutes: [],
      customers: [],
      previousCustomers: [],
      vehicles: [
        vehicle('v1', 'ABC123', 4),
        vehicle('v2', 'DEF456', 2),
        vehicle('v3', 'GHI789', 2),
      ],
    });

    expect(
      insights.some((item) => item.title.includes('ABC123') && item.title.includes('custo/km')),
    ).toBe(true);
  });
});
