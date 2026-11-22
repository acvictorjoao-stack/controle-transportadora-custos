import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe, expect, it} from 'vitest';

import type {
  OperationalDreDimensionGroup,
  OperationalDreExpenseRow,
  OperationalDreFilters,
  OperationalDreGroupDimension,
  OperationalDreTripRow,
} from '../../types';
import {PROFITABILITY_GLOSSARY, PROFITABILITY_TERMS} from '../../utils/profitability-glossary';
import {calculateOperationalDre} from '../operational-dre-calculator';
import {
  calculateOperationalDreByCustomer,
  calculateOperationalDreByDriver,
  calculateOperationalDreByRoute,
  calculateOperationalDreByVehicle,
  groupOperationalDreByDimension,
  OPERATIONAL_DRE_UNASSIGNED_DIMENSION_KEY,
  sumTripCosts,
} from '../operational-dre-by-dimension';

/**
 * Fase 2.2.1 — Invariantes da rentabilidade operacional.
 *
 * Cenário único que cobre os casos reais vistos em produção:
 * - V1: manutenção sem viagem (R$ 400) rateada entre T1 (100 km) e T2 (300 km);
 * - V2: custo sem viagem (R$ 200), mas o veículo não tem KM no período → não atribuível;
 * - T4: viagem sem veículo, sem cliente e sem motorista;
 * - folha sem viagem e sem veículo (R$ 1.000) → não atribuível.
 */

function trip(overrides: Partial<OperationalDreTripRow> & {id: string}): OperationalDreTripRow {
  return {
    branchId: 'branch-1',
    customerId: null,
    routeId: null,
    vehicleId: null,
    driverId: null,
    contractedFreightValue: null,
    actualFreightValue: null,
    distanceKm: 0,
    ...overrides,
  };
}

function expense(overrides: Partial<OperationalDreExpenseRow> & {id: string; amount: number}): OperationalDreExpenseRow {
  return {
    branchId: 'branch-1',
    customerId: null,
    tripId: null,
    vehicleId: null,
    driverId: null,
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

const trips: OperationalDreTripRow[] = [
  trip({id: 'T1', vehicleId: 'V1', routeId: 'R1', customerId: 'C1', driverId: 'D1', distanceKm: 100, contractedFreightValue: 1000}),
  trip({id: 'T2', vehicleId: 'V1', routeId: 'R2', customerId: 'C2', driverId: 'D1', distanceKm: 300, actualFreightValue: 2000}),
  trip({id: 'T3', vehicleId: 'V2', routeId: 'R1', customerId: 'C1', driverId: 'D2', distanceKm: 0, contractedFreightValue: 500}),
  trip({id: 'T4', vehicleId: null, routeId: 'R2', customerId: null, driverId: null, distanceKm: 50, contractedFreightValue: 400}),
];

const expenses: OperationalDreExpenseRow[] = [
  expense({id: 'e1', amount: 100, tripId: 'T1', vehicleId: 'V1', categorySlug: 'combustivel'}),
  expense({id: 'e2', amount: 50, tripId: 'T2', sourceModule: 'trip_expense'}),
  expense({id: 'e3', amount: 400, vehicleId: 'V1', categorySlug: 'manutencao'}),
  expense({id: 'e4', amount: 200, vehicleId: 'V2', categorySlug: 'pneus'}),
  expense({id: 'e5', amount: 1000, sourceModule: 'payroll'}),
  expense({id: 'e6', amount: 30, tripId: 'T4'}),
];

/** Como `getOperationalDreBundle`: base de KM = viagens dos veículos; despesas órfãs dos veículos. */
const allocation = {
  allocationBaseTrips: trips,
  unlinkedVehicleExpenses: expenses.filter((row) => row.tripId === null && row.vehicleId !== null),
};

/** Agrupamento completo do motor (inclui o grupo "Sem …"). */
function fullGroups(dimension: OperationalDreGroupDimension, includeTrips = false): OperationalDreDimensionGroup[] {
  return groupOperationalDreByDimension(trips, expenses, {}, {dimension, includeTrips, ...allocation});
}

const dimensions: Array<[string, OperationalDreGroupDimension]> = [
  ['veículo', 'vehicle'],
  ['rota', 'route'],
  ['cliente', 'customer'],
  ['motorista', 'driver'],
];

const sum = (values: number[]) => Math.round(values.reduce((total, value) => total + value, 0) * 100) / 100;

describe('Fase 2.2.1 — DRE: custos atribuídos + não atribuíveis = total', () => {
  const dre = calculateOperationalDre(trips, expenses, {});

  it('valores do cenário (receita, total, atribuídos, não atribuíveis)', () => {
    expect(dre.revenues.totalRevenue).toBe(3900);
    expect(dre.costs.totalOperatingCosts).toBe(1780);
    // e1 + e2 + e3 (rateada em V1) + e6
    expect(dre.costs.allocatedOperatingCosts).toBe(580);
    // e4 (V2 sem KM) + e5 (folha)
    expect(dre.costs.unattributableOperatingCosts).toBe(1200);
  });

  it('conservação: atribuídos + não atribuíveis = total da DRE', () => {
    expect(dre.costs.allocatedOperatingCosts + dre.costs.unattributableOperatingCosts).toBe(
      dre.costs.totalOperatingCosts,
    );
  });

  it('lucro da DRE = soma dos lucros de todos os grupos − não atribuíveis', () => {
    const groupsProfit = sum(fullGroups('vehicle').map((group) => group.totalProfit ?? 0));
    expect(groupsProfit).toBe(3900 - 580);
    expect(dre.result.operatingProfit).toBe(groupsProfit - dre.costs.unattributableOperatingCosts);
  });
});

describe.each(dimensions)('Fase 2.2.1 — dimensão %s sem filtro (com o grupo "Sem …") soma o mesmo que a DRE', (_name, dimension) => {
  const dre = calculateOperationalDre(trips, expenses, {});
  const groups = fullGroups(dimension);

  it('receita, custo atribuído, viagens e KM dos grupos = DRE', () => {
    expect(sum(groups.map((group) => group.totalRevenue))).toBe(dre.revenues.totalRevenue);
    expect(sum(groups.map((group) => group.totalCost))).toBe(dre.costs.allocatedOperatingCosts);
    expect(groups.reduce((total, group) => total + group.tripCount, 0)).toBe(trips.length);
    expect(sum(groups.map((group) => group.totalKm))).toBe(450);
  });

  it('custo/KM e receita/KM do grupo = total ÷ KM; sem KM, sem índice', () => {
    for (const group of groups) {
      if (group.totalKm > 0) {
        expect(group.costPerKm).toBeCloseTo(group.totalCost / group.totalKm, 10);
        expect(group.revenuePerKm).toBeCloseTo(group.totalRevenue / group.totalKm, 10);
      } else {
        expect(group.costPerKm).toBeNull();
        expect(group.revenuePerKm).toBeNull();
      }
    }
  });
});

describe('Fase 2.2.1 — rankings por veículo, cliente e motorista deixam de fora a viagem sem vínculo', () => {
  // As funções de ranking removem o grupo "Sem veículo/cliente/motorista" (a de
  // rota mantém "Sem rota"). O KPI da tela vem da DRE e inclui essas viagens; o
  // ranking não. A 2.2.4 precisa mostrar essa diferença.
  it.each([
    ['veículo', 'vehicle', calculateOperationalDreByVehicle],
    ['cliente', 'customer', calculateOperationalDreByCustomer],
    ['motorista', 'driver', calculateOperationalDreByDriver],
  ] as const)('%s: ranking + viagem sem vínculo (T4: receita 400, custo 30) = DRE', (_name, dimension, calculate) => {
    const ranking = calculate(trips, expenses, {}, new Map(), allocation);
    expect(ranking.some((group) => group.dimensionKey === OPERATIONAL_DRE_UNASSIGNED_DIMENSION_KEY)).toBe(false);
    const unassigned = fullGroups(dimension).find(
      (group) => group.dimensionKey === OPERATIONAL_DRE_UNASSIGNED_DIMENSION_KEY,
    );
    expect(unassigned).toMatchObject({tripCount: 1, totalRevenue: 400, totalCost: 30});
    expect(sum(ranking.map((group) => group.totalRevenue)) + (unassigned?.totalRevenue ?? 0)).toBe(3900);
    expect(sum(ranking.map((group) => group.totalCost)) + (unassigned?.totalCost ?? 0)).toBe(580);
  });

  it('rota mantém o grupo "Sem rota" no ranking', () => {
    const withoutRoute = [...trips, trip({id: 'T5', distanceKm: 10, contractedFreightValue: 70})];
    const ranking = calculateOperationalDreByRoute(withoutRoute, expenses, {}, new Map(), {
      ...allocation,
      allocationBaseTrips: withoutRoute,
    });
    expect(ranking.map((group) => group.label)).toContain('Sem rota');
  });
});

describe('Fase 2.2.1 — viagem: resultado direto × resultado com rateio', () => {
  const vehicleTrips = (vehicleKey: string) =>
    fullGroups('vehicle', true).find((group) => group.dimensionKey === vehicleKey)?.trips ?? [];

  it('custo com rateio = custo direto + parte rateada do veículo', () => {
    const v1 = fullGroups('vehicle').find((group) => group.dimensionKey === 'V1');
    // T1: 100 direto + 100 de rateio (100/400 km de R$ 400); T2: 50 direto + 300 de rateio.
    expect(sumTripCosts('T1', expenses)).toBe(100);
    expect(sumTripCosts('T2', expenses)).toBe(50);
    expect(v1?.totalCost).toBe(100 + 100 + 50 + 300);
    expect(vehicleTrips('V1').map((row) => [row.id, row.cost])).toEqual([
      ['T1', 200],
      ['T2', 350],
    ]);
  });

  it('a soma das viagens do grupo = custo do grupo; custo com rateio ≥ direto', () => {
    for (const group of fullGroups('vehicle')) {
      const detail = vehicleTrips(group.dimensionKey);
      expect(sum(detail.map((row) => row.cost))).toBe(group.totalCost);
      for (const row of detail) {
        expect(row.cost).toBeGreaterThanOrEqual(sumTripCosts(row.id, expenses));
      }
    }
  });

  it('veículo sem KM no período: o custo dele não vai para a viagem (fica não atribuível)', () => {
    expect(vehicleTrips('V2').map((row) => [row.id, row.cost])).toEqual([['T3', 0]]);
  });
});

describe('Fase 2.2.1 — com filtro de rota', () => {
  // Os grupos rateiam o custo do veículo por todas as viagens dele (denominador
  // correto); o KPI "custos atribuídos" da DRE rateia só pelas viagens do recorte
  // e fica maior que a soma do ranking. Corrigir na 2.2.4; este teste passa a
  // "passar inesperadamente" quando for corrigido, e então vira um it normal.
  it.fails('custos atribuídos da DRE = soma dos grupos (pendente)', () => {
    const filters: OperationalDreFilters = {routeId: 'R1'};
    const scopedTrips = trips.filter((row) => row.routeId === 'R1');
    const dre = calculateOperationalDre(scopedTrips, expenses, filters);
    const groups = calculateOperationalDreByRoute(scopedTrips, expenses, filters, new Map(), allocation);
    expect(sum(groups.map((group) => group.totalCost))).toBe(dre.costs.allocatedOperatingCosts);
  });
});

describe('Fase 2.2.1 — glossário', () => {
  it('cada termo tem rótulo, descrição e fonte', () => {
    for (const term of PROFITABILITY_TERMS) {
      const definition = PROFITABILITY_GLOSSARY[term];
      expect(definition.term).toBe(term);
      expect(definition.label.length).toBeGreaterThan(3);
      expect(definition.description.length).toBeGreaterThan(20);
      expect(definition.source.length).toBeGreaterThan(5);
    }
  });

  it('as funções citadas como fonte existem no código', () => {
    const code = [
      'features/dre/services/operational-dre-calculator.ts',
      'features/dre/services/operational-dre-by-dimension.ts',
      'features/financial/services/allocate-operational-costs-by-mileage.ts',
      'features/trips/utils/trip-distance.ts',
      'features/trips/utils/trip-lifecycle.ts',
      'supabase/migrations/111_trip_expense_financial_sync.sql',
    ]
      .map((file) => readFileSync(resolve(process.cwd(), file), 'utf8'))
      .join('\n');
    const names = new Set(
      PROFITABILITY_TERMS.flatMap(
        (term) => PROFITABILITY_GLOSSARY[term].source.match(/\b[a-z][A-Za-z_]*[A-Z_][A-Za-z_]*\b/g) ?? [],
      ),
    );
    expect(names.size).toBeGreaterThan(8);
    for (const name of names) {
      expect(code, name).toContain(name);
    }
  });
});
