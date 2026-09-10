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
    expect(insights.find((i) => i.id === 'top-customer')?.subtitle).toContain(
      'Lucro',
    );
    expect(insights.find((i) => i.id === 'top-vehicle')?.label).toBe('ABC-1234');
    expect(insights.find((i) => i.id === 'branch')?.label).toBe('São Luís');
    expect(
      insights.find((i) => i.id === 'top-customer')?.href,
    ).toContain('cliente=c1');
  });

  it('Audit #6: totalProfit null não vira ranking nem subtítulo monetário', () => {
    const insights = buildRelatedInsights({
      filters: {costCenterId: 'cc-1'},
      customers: [
        customer({
          dimensionKey: 'c1',
          label: 'Cliente CC',
          totalProfit: null,
          totalRevenue: 0,
          marginPercent: null,
        }),
        customer({
          dimensionKey: 'c2',
          label: 'Outro CC',
          totalProfit: null,
          totalRevenue: 0,
          marginPercent: null,
        }),
      ],
      vehicles: [
        vehicle({
          dimensionKey: 'v1',
          label: 'ABC-1234',
          tripCount: 5,
          totalProfit: null,
          totalRevenue: 0,
          marginPercent: null,
        }),
        vehicle({
          dimensionKey: 'v2',
          label: 'XYZ-0001',
          tripCount: 2,
          totalProfit: null,
          totalRevenue: 0,
          marginPercent: null,
        }),
      ],
      routes: [
        route({
          dimensionKey: 'r1',
          label: 'SLZ → Imp',
          totalProfit: null,
          totalRevenue: 0,
          marginPercent: null,
        }),
      ],
      branchLabel: 'São Luís',
    });

    expect(insights.some((i) => i.id === 'top-customer')).toBe(false);
    expect(insights.some((i) => i.id === 'top-profit-vehicle')).toBe(false);
    expect(insights.some((i) => i.id === 'top-route')).toBe(false);
    // Volume operacional (viagens) continua disponível
    expect(insights.find((i) => i.id === 'top-vehicle')?.label).toBe('ABC-1234');
    expect(insights.find((i) => i.id === 'branch')?.label).toBe('São Luís');
  });

  it('Audit #6: null não compete com lucro numérico na ordenação', () => {
    const insights = buildRelatedInsights({
      filters: {},
      customers: [
        customer({
          dimensionKey: 'c-null',
          label: 'Sem lucro',
          totalProfit: null,
        }),
        customer({
          dimensionKey: 'c-win',
          label: 'Com lucro',
          totalProfit: 40,
        }),
      ],
      vehicles: [],
      routes: [
        route({
          dimensionKey: 'r-null',
          label: 'Rota sem lucro',
          totalProfit: null,
          marginPercent: null,
        }),
        route({
          dimensionKey: 'r-win',
          label: 'Rota com lucro',
          totalProfit: 25,
          marginPercent: null,
        }),
      ],
    });

    expect(insights.find((i) => i.id === 'top-customer')?.label).toBe(
      'Com lucro',
    );
    expect(insights.find((i) => i.id === 'top-customer')?.subtitle).not.toBe(
      'Lucro —',
    );
    expect(insights.find((i) => i.id === 'top-route')?.label).toBe(
      'Rota com lucro',
    );
    expect(insights.find((i) => i.id === 'top-route')?.subtitle).not.toBe('—');
  });
});
