import {describe, expect, it} from 'vitest';

import {calculateOperationalDre, summarizeTripDimensions} from '../../services/operational-dre-calculator';
import {calculateOperationalDreByRoute, calculateOperationalDreByVehicle} from '../../services/operational-dre-by-dimension';
import type {OperationalDreExpenseRow, OperationalDreTripRow} from '../../types';
import {computeRankingCoverage} from '../ranking-coverage';

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

// Cenário da 2.2.1: T4 sem veículo (receita 400, custo 30).
const trips = [
  trip({id: 'T1', vehicleId: 'V1', routeId: 'R1', distanceKm: 100, contractedFreightValue: 1000, distanceSource: 'odometer'}),
  trip({id: 'T2', vehicleId: 'V1', routeId: 'R2', distanceKm: 300, actualFreightValue: 2000, distanceSource: 'planned'}),
  trip({id: 'T3', vehicleId: 'V2', routeId: 'R1', distanceKm: 0, contractedFreightValue: 500, distanceSource: 'none'}),
  trip({id: 'T4', vehicleId: null, routeId: 'R2', distanceKm: 50, contractedFreightValue: 400, distanceSource: 'odometer'}),
];
const expenses = [
  expense({id: 'e1', amount: 100, tripId: 'T1', vehicleId: 'V1'}),
  expense({id: 'e2', amount: 50, tripId: 'T2'}),
  expense({id: 'e3', amount: 400, vehicleId: 'V1'}),
  expense({id: 'e4', amount: 200, vehicleId: 'V2'}),
  expense({id: 'e5', amount: 1000, sourceModule: 'payroll'}),
  expense({id: 'e6', amount: 30, tripId: 'T4'}),
];
const allocation = {
  allocationBaseTrips: trips,
  unlinkedVehicleExpenses: expenses.filter((row) => row.tripId === null && row.vehicleId !== null),
};

describe('Fase 2.2.4 — o que fica fora do ranking', () => {
  const dre = calculateOperationalDre(trips, expenses, {});

  it('ranking por veículo: a viagem sem veículo (receita 400, custo 30) aparece como fora', () => {
    const groups = calculateOperationalDreByVehicle(trips, expenses, {}, new Map(), allocation);
    expect(computeRankingCoverage({dre, groups, filters: {}})).toEqual({
      tripsOutside: 1,
      revenueOutside: 400,
      costOutside: 30,
    });
  });

  it('ranking por rota mantém "Sem rota": nada fica fora', () => {
    const groups = calculateOperationalDreByRoute(trips, expenses, {}, new Map(), allocation);
    expect(computeRankingCoverage({dre, groups, filters: {}})).toBeNull();
  });

  it('com filtro de dimensão, o custo fora não é informado (bases de rateio diferentes)', () => {
    const filters = {customerId: 'C9'};
    const groups = calculateOperationalDreByVehicle(trips, expenses, {}, new Map(), allocation);
    expect(computeRankingCoverage({dre, groups, filters})).toMatchObject({tripsOutside: 1, revenueOutside: 400, costOutside: null});
  });
});

describe('Fase 2.2.4 — qualidade do KM nos indicadores da DRE', () => {
  it('conta viagens por origem do KM', () => {
    expect(calculateOperationalDre(trips, expenses, {}).indicators.kmQuality).toEqual({odometer: 2, planned: 1, none: 1});
  });

  it('sem a origem em alguma viagem (dados antigos), não informa', () => {
    const legacy = trips.map(({distanceSource: _source, ...rest}) => rest);
    expect(summarizeTripDimensions(legacy).kmQuality).toBeUndefined();
    expect(calculateOperationalDre(legacy, expenses, {}).indicators).not.toHaveProperty('kmQuality');
  });

  it('vale também no modo só custos', () => {
    expect(calculateOperationalDre(trips, expenses, {costCenterId: 'cc-1'}).indicators.kmQuality).toEqual({
      odometer: 2,
      planned: 1,
      none: 1,
    });
  });
});
