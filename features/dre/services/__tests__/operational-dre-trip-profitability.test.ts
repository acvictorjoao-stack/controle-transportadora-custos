import {describe, expect, it} from 'vitest';

import {resolveTripDistanceSource} from '@/features/trips/utils/trip-distance';

import type {OperationalDreExpenseRow, OperationalDreTripDetailRow, OperationalDreTripRow} from '../../types';
import {calculateOperationalDre} from '../operational-dre-calculator';
import {calculateOperationalDreByVehicle, sumTripCosts} from '../operational-dre-by-dimension';
import {
  buildTripProfitabilityRows,
  sortTripProfitabilityRows,
  summarizeTripProfitability,
  type TripProfitabilityRow,
} from '../operational-dre-trip-profitability';

// Mesmo cenário das invariantes da 2.2.1: rateio em V1, V2 sem KM, T4 sem veículo, folha sem vínculo.
function trip(overrides: Partial<OperationalDreTripDetailRow> & {id: string}): OperationalDreTripDetailRow {
  return {
    branchId: 'branch-1',
    customerId: null,
    routeId: null,
    vehicleId: null,
    driverId: null,
    contractedFreightValue: null,
    actualFreightValue: null,
    distanceKm: 0,
    distanceSource: 'none',
    tripNumber: overrides.id,
    completedAt: '2026-10-10T12:00:00Z',
    vehicleLabel: null,
    driverLabel: null,
    customerLabel: null,
    routeLabel: null,
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

const trips = [
  trip({id: 'T1', vehicleId: 'V1', distanceKm: 100, distanceSource: 'odometer', contractedFreightValue: 1000, completedAt: '2026-10-01T12:00:00Z'}),
  trip({id: 'T2', vehicleId: 'V1', distanceKm: 300, distanceSource: 'planned', actualFreightValue: 2000, completedAt: '2026-10-05T12:00:00Z'}),
  trip({id: 'T3', vehicleId: 'V2', distanceKm: 0, distanceSource: 'none', contractedFreightValue: 500, completedAt: '2026-10-09T12:00:00Z'}),
  trip({id: 'T4', vehicleId: null, distanceKm: 50, distanceSource: 'odometer', contractedFreightValue: 400, completedAt: '2026-10-20T12:00:00Z'}),
];
const expenses = [
  expense({id: 'e1', amount: 100, tripId: 'T1', vehicleId: 'V1'}),
  expense({id: 'e2', amount: 50, tripId: 'T2', sourceModule: 'trip_expense'}),
  expense({id: 'e3', amount: 400, vehicleId: 'V1'}),
  expense({id: 'e4', amount: 200, vehicleId: 'V2'}),
  expense({id: 'e5', amount: 1000, sourceModule: 'payroll'}),
  expense({id: 'e6', amount: 30, tripId: 'T4'}),
];
const allocation = {
  allocationBaseTrips: trips as OperationalDreTripRow[],
  unlinkedVehicleExpenses: expenses.filter((row) => row.tripId === null && row.vehicleId !== null),
};

const rows = buildTripProfitabilityRows({trips, expenses, ...allocation});
const byId = (id: string) => rows.find((row) => row.id === id)!;

describe('Fase 2.2.3 — linhas de rentabilidade por viagem', () => {
  it('resultado direto (só custos da viagem) × com rateio (inclui a parte do veículo)', () => {
    expect(byId('T1')).toMatchObject({revenue: 1000, directCost: 100, allocatedCost: 200, vehicleShare: 100, directResult: 900, allocatedResult: 800});
    expect(byId('T2')).toMatchObject({revenue: 2000, directCost: 50, allocatedCost: 350, vehicleShare: 300, directResult: 1950, allocatedResult: 1650});
    // V2 não tem KM: o custo dele não entra na viagem.
    expect(byId('T3')).toMatchObject({directCost: 0, allocatedCost: 0, vehicleShare: 0, allocatedResult: 500});
    expect(byId('T4')).toMatchObject({directCost: 30, allocatedCost: 30, allocatedResult: 370});
  });

  it('custo direto = sumTripCosts (o mesmo critério da view trip_financial_summary)', () => {
    for (const row of rows) expect(row.directCost).toBe(sumTripCosts(row.id, expenses));
  });

  it('soma das viagens = custos atribuídos da DRE; e bate com o ranking por veículo', () => {
    const dre = calculateOperationalDre(trips, expenses, {});
    const total = rows.reduce((sum, row) => sum + row.allocatedCost, 0);
    expect(total).toBe(dre.costs.allocatedOperatingCosts);
    const v1 = calculateOperationalDreByVehicle(trips, expenses, {}, new Map(), allocation).find(
      (group) => group.dimensionKey === 'V1',
    );
    expect(byId('T1').allocatedCost + byId('T2').allocatedCost).toBe(v1?.totalCost);
  });

  it('margem, custo/KM e lucro/KM; sem KM, sem índice por KM', () => {
    expect(byId('T1').allocatedMarginPercent).toBe(80);
    expect(byId('T1').directMarginPercent).toBe(90);
    expect(byId('T1').costPerKm).toBe(2);
    expect(byId('T1').profitPerKm).toBe(8);
    expect(byId('T3').costPerKm).toBeNull();
    expect(byId('T3').profitPerKm).toBeNull();
  });

  it('modo só custos (filtro de centro de custo): sem receita, resultado nem margem', () => {
    const costsOnly = buildTripProfitabilityRows({trips, expenses, filters: {costCenterId: 'cc-1'}, ...allocation});
    for (const row of costsOnly) {
      expect(row.revenue).toBe(0);
      expect(row.directResult).toBeNull();
      expect(row.allocatedResult).toBeNull();
      expect(row.allocatedMarginPercent).toBeNull();
    }
    expect(summarizeTripProfitability(costsOnly).allocatedResult).toBeNull();
  });
});

describe('Fase 2.2.3 — arredondamento', () => {
  it('rateio fracionado: a soma das viagens bate com a DRE (arredondar por linha somaria centavos)', () => {
    const thirds = ['A', 'B', 'C'].map((id) =>
      trip({id, vehicleId: 'VX', distanceKm: 1, distanceSource: 'odometer', contractedFreightValue: 10}),
    );
    const shared = [expense({id: 'x1', amount: 100, vehicleId: 'VX'}), expense({id: 'x2', amount: 0.05, tripId: 'A'})];
    const fractional = buildTripProfitabilityRows({
      trips: thirds,
      expenses: shared,
      allocationBaseTrips: thirds,
      unlinkedVehicleExpenses: shared.filter((row) => row.tripId === null),
    });
    const dre = calculateOperationalDre(thirds, shared, {});
    const summary = summarizeTripProfitability(fractional);
    expect(fractional[1].allocatedCost).toBeCloseTo(100 / 3, 10);
    expect(summary.allocatedCost).toBe(Math.round(dre.costs.allocatedOperatingCosts * 100) / 100);
    expect(summary.allocatedCost).toBe(100.05);
    expect(summary.allocatedResult).toBe(30 - 100.05);
  });
});

describe('Fase 2.2.3 — resumo', () => {
  it('totais e qualidade do KM', () => {
    expect(summarizeTripProfitability(rows)).toEqual({
      tripCount: 4,
      revenue: 3900,
      directCost: 180,
      allocatedCost: 580,
      directResult: 3720,
      allocatedResult: 3320,
      allocatedMarginPercent: (3320 / 3900) * 100,
      totalKm: 450,
      profitPerKm: 3320 / 450,
      kmQuality: {odometer: 2, planned: 1, none: 1},
    });
  });

  it('sem viagens: tudo zero, sem margem nem índice', () => {
    expect(summarizeTripProfitability([])).toMatchObject({tripCount: 0, revenue: 0, allocatedMarginPercent: null, profitPerKm: null});
  });
});

describe('Fase 2.2.3 — ordenação do ranking', () => {
  const ids = (list: TripProfitabilityRow[]) => list.map((row) => row.id);

  it('maior e menor resultado com rateio', () => {
    expect(ids(sortTripProfitabilityRows(rows, 'result_desc'))).toEqual(['T2', 'T1', 'T3', 'T4']);
    expect(ids(sortTripProfitabilityRows(rows, 'result_asc'))).toEqual(['T4', 'T3', 'T1', 'T2']);
  });

  it('margem e data; valores nulos vão para o fim', () => {
    expect(ids(sortTripProfitabilityRows(rows, 'margin_desc'))).toEqual(['T3', 'T4', 'T2', 'T1']);
    expect(ids(sortTripProfitabilityRows(rows, 'date_desc'))).toEqual(['T4', 'T3', 'T2', 'T1']);
    const withNull = [...rows, {...byId('T1'), id: 'T9', tripNumber: 'T9', allocatedResult: null}];
    expect(ids(sortTripProfitabilityRows(withNull, 'result_desc')).at(-1)).toBe('T9');
  });
});

describe('Fase 2.2.3 — origem do KM', () => {
  it.each([
    [{initialOdometerKm: 1000, finalOdometerKm: 1480, plannedDistanceKm: 500}, 'odometer'],
    [{initialOdometerKm: 1000, finalOdometerKm: null, plannedDistanceKm: 500}, 'planned'],
    [{initialOdometerKm: 1000, finalOdometerKm: 900, plannedDistanceKm: 500}, 'planned'],
    [{initialOdometerKm: 1000, finalOdometerKm: 1000, plannedDistanceKm: null}, 'none'],
    [{initialOdometerKm: null, finalOdometerKm: null, plannedDistanceKm: 0}, 'none'],
  ] as const)('%o → %s', (input, expected) => {
    expect(resolveTripDistanceSource(input)).toBe(expected);
  });
});
