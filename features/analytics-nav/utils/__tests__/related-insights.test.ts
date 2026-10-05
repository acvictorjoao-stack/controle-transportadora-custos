import {describe, expect, it} from 'vitest';

import {buildRelatedInsights} from '../related-insights';
import {
  buildCrossNavHref,
  mergeAnalyticsFilters,
} from '../shared-filters';
import {calculateOperationalDreByDriver} from '@/features/dre/services/operational-dre-by-dimension';
import type {
  OperationalDreCustomerGroup,
  OperationalDreDriverGroup,
  OperationalDreExpenseRow,
  OperationalDreRouteGroup,
  OperationalDreTripRow,
  OperationalDreVehicleGroup,
} from '@/features/dre/types';
import {formatCurrencyBr} from '@/features/financial/utils/financial-format';
import {buildDriverRankingRows} from '@/features/organization/dashboard/utils/rankings';

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

function driver(
  partial: Partial<OperationalDreDriverGroup> & {
    dimensionKey: string;
    label: string;
  },
): OperationalDreDriverGroup {
  return {
    dimensionType: 'driver',
    tripCount: 1,
    totalRevenue: 100,
    totalCost: 40,
    totalProfit: 60,
    marginPercent: 60,
    totalKm: 10,
    costPerKm: 4,
    revenuePerKm: 10,
    trips: [],
    driver: {id: partial.dimensionKey, label: partial.label},
    ...partial,
  };
}

function tripRow(
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

function expenseRow(
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

function topDriverInsight(
  drivers: OperationalDreDriverGroup[],
  filters: Parameters<typeof buildRelatedInsights>[0]['filters'] = {},
) {
  return buildRelatedInsights({filters, drivers}).find(
    (i) => i.id === 'top-driver',
  );
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

describe('Audit #28 — insight "Motorista com maior lucro"', () => {
  it('identifica o motorista com maior lucro absoluto e seu valor', () => {
    const insight = topDriverInsight([
      driver({dimensionKey: 'd1', label: 'João', totalProfit: 1200, marginPercent: 10}),
      driver({dimensionKey: 'd2', label: 'Maria', totalProfit: 3400, marginPercent: 20}),
      driver({dimensionKey: 'd3', label: 'Pedro', totalProfit: 500, marginPercent: 90}),
    ]);

    expect(insight?.title).toBe('Motorista com maior lucro');
    expect(insight?.label).toBe('Maria');
    expect(insight?.subtitle).toBe(formatCurrencyBr(3400));
    expect(insight?.href).toContain('/dashboard/rentabilidade/motoristas');
    expect(insight?.href).toContain('motorista=d2');
  });

  it('usa lucro absoluto, não margem', () => {
    const insight = topDriverInsight([
      driver({dimensionKey: 'd-margin', label: 'Alta margem', totalProfit: 100, marginPercent: 95}),
      driver({dimensionKey: 'd-profit', label: 'Alto lucro', totalProfit: 900, marginPercent: 15}),
    ]);

    expect(insight?.label).toBe('Alto lucro');
  });

  it('não retorna mais o texto genérico fixo', () => {
    const insight = topDriverInsight([
      driver({dimensionKey: 'd1', label: 'João', totalProfit: 10}),
    ]);

    expect(insight?.label).not.toBe('Ver motoristas');
    expect(insight?.subtitle).not.toBe('Análise por motorista');
  });

  it('preserva o período aplicado no link do insight', () => {
    const insight = topDriverInsight(
      [driver({dimensionKey: 'd1', label: 'João', totalProfit: 10})],
      {dateFrom: '2026-03-01', dateTo: '2026-03-31'},
    );

    expect(insight?.href).toContain('de=2026-03-01');
    expect(insight?.href).toContain('ate=2026-03-31');
  });

  it('preserva os filtros aplicados e só sobrescreve o motorista', () => {
    const insight = topDriverInsight(
      [driver({dimensionKey: 'd-win', label: 'Vencedor', totalProfit: 10})],
      {
        branchId: 'b1',
        customerId: 'c1',
        routeId: 'r1',
        vehicleId: 'v1',
        dateFrom: '2026-03-01',
        dateTo: '2026-03-31',
      },
    );

    expect(insight?.href).toContain('filial=b1');
    expect(insight?.href).toContain('cliente=c1');
    expect(insight?.href).toContain('rota=r1');
    expect(insight?.href).toContain('veiculo=v1');
    expect(insight?.href).toContain('motorista=d-win');
  });

  it('com filtro de motorista, aponta para o próprio motorista filtrado', () => {
    const insight = topDriverInsight(
      [driver({dimensionKey: 'd-filtered', label: 'Filtrado', totalProfit: -20})],
      {driverId: 'd-filtered'},
    );

    expect(insight?.label).toBe('Filtrado');
    expect(insight?.href).toContain('motorista=d-filtered');
  });

  it('lucro positivo vence lucros negativos', () => {
    const insight = topDriverInsight([
      driver({dimensionKey: 'd-neg', label: 'Prejuízo', totalProfit: -500}),
      driver({dimensionKey: 'd-pos', label: 'Lucro', totalProfit: 50}),
    ]);

    expect(insight?.label).toBe('Lucro');
  });

  it('todos negativos: mostra o maior resultado real, com valor negativo', () => {
    const insight = topDriverInsight([
      driver({dimensionKey: 'd-a', label: 'Menor prejuízo', totalProfit: -50}),
      driver({dimensionKey: 'd-b', label: 'Maior prejuízo', totalProfit: -900}),
    ]);

    expect(insight?.label).toBe('Menor prejuízo');
    expect(insight?.subtitle).toBe(formatCurrencyBr(-50));
  });

  it('sem motoristas: omite o insight, sem inventar motorista ou valor', () => {
    expect(topDriverInsight([])).toBeUndefined();
    expect(
      buildRelatedInsights({filters: {}}).some((i) => i.id === 'top-driver'),
    ).toBe(false);
  });

  it('sem lucro calculável (modo só custos): omite o insight', () => {
    const insight = topDriverInsight([
      driver({dimensionKey: 'd1', label: 'A', totalProfit: null, totalRevenue: 0, marginPercent: null}),
      driver({dimensionKey: 'd2', label: 'B', totalProfit: null, totalRevenue: 0, marginPercent: null}),
    ]);

    expect(insight).toBeUndefined();
  });

  it('lucro null não compete com lucro numérico', () => {
    const insight = topDriverInsight([
      driver({dimensionKey: 'd-null', label: 'Sem lucro', totalProfit: null}),
      driver({dimensionKey: 'd-num', label: 'Com lucro', totalProfit: -10}),
    ]);

    expect(insight?.label).toBe('Com lucro');
  });

  it('ignora o grupo "sem motorista"', () => {
    const insight = topDriverInsight([
      driver({dimensionKey: '__none__', label: 'Sem motorista', totalProfit: 9999}),
    ]);

    expect(insight).toBeUndefined();
  });

  it('empate: mantém a ordem de entrada (estável), igual às demais dimensões', () => {
    const insight = topDriverInsight([
      driver({dimensionKey: 'd-first', label: 'Primeiro', totalProfit: 300}),
      driver({dimensionKey: 'd-second', label: 'Segundo', totalProfit: 300}),
    ]);

    expect(insight?.label).toBe('Primeiro');
  });

  it('consistência: mesmo lucro alocado e mesmo vencedor do ranking de motoristas', () => {
    const trips = [
      tripRow({id: 't1', driverId: 'drv-a', actualFreightValue: 5000, contractedFreightValue: 5000, distanceKm: 100}),
      tripRow({id: 't2', driverId: 'drv-b', actualFreightValue: 8000, contractedFreightValue: 8000, distanceKm: 100}),
      tripRow({id: 't3', driverId: 'drv-c', actualFreightValue: 2000, contractedFreightValue: 2000, distanceKm: 100}),
    ];
    const expenses = [
      expenseRow({id: 'e1', amount: 1000, tripId: 't1', vehicleId: 'vehicle-1'}),
      expenseRow({id: 'e2', amount: 6500, tripId: 't2', vehicleId: 'vehicle-1'}),
      expenseRow({id: 'e3', amount: 500, tripId: 't3', vehicleId: 'vehicle-1'}),
      // Não atribuível (Audit #12): fica fora do lucro por motorista.
      expenseRow({id: 'payroll', amount: 10_000}),
    ];
    const groups = calculateOperationalDreByDriver(
      trips,
      expenses,
      {},
      new Map([
        ['drv-a', 'Motorista A'],
        ['drv-b', 'Motorista B'],
        ['drv-c', 'Motorista C'],
      ]),
    );
    const ranking = buildDriverRankingRows(groups);

    const insight = buildRelatedInsights({filters: {}, drivers: groups}).find(
      (i) => i.id === 'top-driver',
    );

    // A: 5000-1000=4000; B: 8000-6500=1500 (maior receita, menor lucro); C: 1500
    expect(ranking[0].name).toBe('Motorista A');
    expect(insight?.label).toBe(ranking[0].name);
    expect(insight?.subtitle).toBe(formatCurrencyBr(ranking[0].profit ?? NaN));
    expect(insight?.subtitle).toBe(formatCurrencyBr(4000));
  });

  it('consistência no empate: mesmo vencedor do ranking de motoristas', () => {
    // Lucro igual (1000); B tem maior receita/custo → ranking desempata por receita.
    const trips = [
      tripRow({id: 't1', driverId: 'drv-a', actualFreightValue: 2000, contractedFreightValue: 2000, distanceKm: 100}),
      tripRow({id: 't2', driverId: 'drv-b', actualFreightValue: 5000, contractedFreightValue: 5000, distanceKm: 100}),
    ];
    const expenses = [
      expenseRow({id: 'e1', amount: 1000, tripId: 't1', vehicleId: 'vehicle-1'}),
      expenseRow({id: 'e2', amount: 4000, tripId: 't2', vehicleId: 'vehicle-1'}),
    ];
    const groups = calculateOperationalDreByDriver(
      trips,
      expenses,
      {},
      new Map([
        ['drv-a', 'Motorista A'],
        ['drv-b', 'Motorista B'],
      ]),
    );
    const ranking = buildDriverRankingRows(groups);
    const insight = buildRelatedInsights({filters: {}, drivers: groups}).find(
      (i) => i.id === 'top-driver',
    );

    expect(groups.map((g) => g.totalProfit)).toEqual([1000, 1000]);
    expect(ranking[0].name).toBe('Motorista B');
    expect(insight?.label).toBe('Motorista B');
  });

  it('não altera os demais insights', () => {
    const insights = buildRelatedInsights({
      filters: {},
      customers: [customer({dimensionKey: 'c1', label: 'Cliente', totalProfit: 10})],
      drivers: [driver({dimensionKey: 'd1', label: 'Motorista', totalProfit: 99})],
    });

    expect(insights.map((i) => i.id)).toEqual([
      'top-customer',
      'top-driver',
      'branch',
    ]);
  });
});
