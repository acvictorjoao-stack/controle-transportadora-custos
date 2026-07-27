import {describe, expect, it} from 'vitest';

import {buildRelatedInsights} from '../related-insights';
import {
  buildCrossNavHref,
  mergeAnalyticsFilters,
} from '../shared-filters';
import type {
  OperationalDreCustomerGroup,
  OperationalDreRouteGroup,
  OperationalDreVehicleGroup,
} from '@/features/dre/types';

function customer(
  partial: Partial<OperationalDreCustomerGroup> & {
    dimensionKey: string;
    label: string;
  },
): OperationalDreCustomerGroup {
  return {
    dimensionType: 'customer',
    tripCount: 1,
    totalRevenue: 100,
    totalCost: 40,
    totalProfit: 60,
    marginPercent: 60,
    totalKm: 10,
    costPerKm: 4,
    revenuePerKm: 10,
    trips: [],
    customer: {id: partial.dimensionKey, label: partial.label},
    ...partial,
  };
}

function vehicle(
  partial: Partial<OperationalDreVehicleGroup> & {
    dimensionKey: string;
    label: string;
  },
): OperationalDreVehicleGroup {
  return {
    dimensionType: 'vehicle',
    tripCount: 1,
    totalRevenue: 100,
    totalCost: 40,
    totalProfit: 60,
    marginPercent: 60,
    totalKm: 10,
    costPerKm: 4,
    revenuePerKm: 10,
    trips: [],
    vehicle: {id: partial.dimensionKey, label: partial.label},
    ...partial,
  };
}

function route(
  partial: Partial<OperationalDreRouteGroup> & {
    dimensionKey: string;
    label: string;
  },
): OperationalDreRouteGroup {
  return {
    dimensionType: 'route',
    tripCount: 1,
    totalRevenue: 100,
    totalCost: 40,
    totalProfit: 60,
    marginPercent: 60,
    totalKm: 10,
    costPerKm: 4,
    revenuePerKm: 10,
    trips: [],
    route: {id: partial.dimensionKey, label: partial.label},
    ...partial,
  };
}

describe('analytics-nav related insights', () => {
  it('preserva filtros ao construir cross-nav', () => {
    const href = buildCrossNavHref(
      'rentabilidade-rotas',
      {customerId: 'c1', dateFrom: '2026-01-01'},
      {routeId: 'r1'},
    );
    expect(href).toContain('/dashboard/rentabilidade/rotas');
    expect(href).toContain('cliente=c1');
    expect(href).toContain('rota=r1');
    expect(href).toContain('de=2026-01-01');
  });

  it('mescla filtros sem perder base', () => {
    expect(
      mergeAnalyticsFilters(
        {customerId: 'c1', vehicleId: 'v1'},
        {routeId: 'r1'},
      ),
    ).toEqual({
      branchId: undefined,
      customerId: 'c1',
      routeId: 'r1',
      vehicleId: 'v1',
      driverId: undefined,
      costCenterId: undefined,
      dateFrom: undefined,
      dateTo: undefined,
    });
  });

  it('deriva insights em memória sem novas consultas', () => {
    const insights = buildRelatedInsights({
      filters: {branchId: 'b1'},
      customers: [
        customer({dimensionKey: 'c1', label: 'Mateus', totalProfit: 310}),
        customer({dimensionKey: 'c2', label: 'Outro', totalProfit: 10}),
      ],
      vehicles: [
        vehicle({dimensionKey: 'v1', label: 'ABC-1234', tripCount: 9}),
        vehicle({
          dimensionKey: 'v2',
          label: 'XYZ-0001',
          tripCount: 2,
          totalProfit: 999,
        }),
      ],
      routes: [route({dimensionKey: 'r1', label: 'SLZ → Imp', totalProfit: 50})],
      branchLabel: 'São Luís',
    });

    expect(insights.some((i) => i.id === 'top-customer')).toBe(true);
    expect(insights.find((i) => i.id === 'top-customer')?.label).toBe('Mateus');
    expect(insights.find((i) => i.id === 'top-vehicle')?.label).toBe('ABC-1234');
    expect(insights.find((i) => i.id === 'branch')?.label).toBe('São Luís');
    expect(
      insights.find((i) => i.id === 'top-customer')?.href,
    ).toContain('cliente=c1');
  });
});
