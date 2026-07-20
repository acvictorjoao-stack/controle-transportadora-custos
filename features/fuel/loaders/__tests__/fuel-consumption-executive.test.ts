import {describe, expect, it} from 'vitest';

import type {FuelConsumptionFleetSummary, FuelConsumptionVehicleRow} from '../../types';
import {buildConsumptionAlerts, buildExecutiveIndicators, buildVehicleRanking} from '../fuel-consumption-executive';

function makeVehicleRow(overrides: Partial<FuelConsumptionVehicleRow> = {}): FuelConsumptionVehicleRow {
  return {
    vehicleId: 'vehicle-1',
    plate: 'AAA0000',
    model: null,
    totalDistanceKm: 1000,
    totalLiters: 100,
    totalFuelCost: 500,
    averageKmPerLiter: 10,
    averageCostPerKm: 0.5,
    operationalDistanceKm: 0,
    operationalLiters: 0,
    operationalFuelCost: 0,
    tripDistanceKm: 1000,
    tripLiters: 100,
    tripFuelCost: 500,
    periodCount: 5,
    ...overrides,
  };
}

function makeFleetSummary(overrides: Partial<FuelConsumptionFleetSummary> = {}): FuelConsumptionFleetSummary {
  return {
    totalVehicles: 1,
    totalDistanceKm: 1000,
    totalLiters: 100,
    totalFuelCost: 500,
    averageKmPerLiter: 10,
    averageCostPerKm: 0.5,
    operationalDistanceKm: 0,
    operationalFuelCost: 0,
    operationalLiters: 0,
    periodCount: 5,
    ...overrides,
  };
}

describe('buildExecutiveIndicators', () => {
  it('picks the best/worst efficiency and highest/lowest cost vehicles, ignoring nulls', () => {
    const vehicles = [
      makeVehicleRow({vehicleId: 'v1', plate: 'V1', averageKmPerLiter: 8, averageCostPerKm: 0.6}),
      makeVehicleRow({vehicleId: 'v2', plate: 'V2', averageKmPerLiter: 12, averageCostPerKm: 0.4}),
      makeVehicleRow({vehicleId: 'v3', plate: 'V3', averageKmPerLiter: null, averageCostPerKm: null, periodCount: 0}),
    ];
    const fleet = makeFleetSummary();

    const executive = buildExecutiveIndicators(fleet, vehicles);

    expect(executive.bestEfficiencyVehicle).toEqual({vehicleId: 'v2', plate: 'V2', value: 12});
    expect(executive.worstEfficiencyVehicle).toEqual({vehicleId: 'v1', plate: 'V1', value: 8});
    expect(executive.highestCostVehicle).toEqual({vehicleId: 'v1', plate: 'V1', value: 0.6});
    expect(executive.lowestCostVehicle).toEqual({vehicleId: 'v2', plate: 'V2', value: 0.4});
  });

  it('returns null highlights when no vehicle has a valid rate', () => {
    const vehicles = [makeVehicleRow({averageKmPerLiter: null, averageCostPerKm: null, periodCount: 0})];
    const fleet = makeFleetSummary({averageKmPerLiter: null, averageCostPerKm: null, periodCount: 0});

    const executive = buildExecutiveIndicators(fleet, vehicles);

    expect(executive.bestEfficiencyVehicle).toBeNull();
    expect(executive.worstEfficiencyVehicle).toBeNull();
    expect(executive.highestCostVehicle).toBeNull();
    expect(executive.lowestCostVehicle).toBeNull();
  });

  it('computes the guarded operational consumption share from fleet totals', () => {
    const fleet = makeFleetSummary({operationalDistanceKm: 250, totalDistanceKm: 1000});

    expect(buildExecutiveIndicators(fleet, []).operationalConsumptionPercentage).toBe(25);
  });

  it('returns null operational consumption share when the fleet has no distance', () => {
    const fleet = makeFleetSummary({operationalDistanceKm: 0, totalDistanceKm: 0});

    expect(buildExecutiveIndicators(fleet, []).operationalConsumptionPercentage).toBeNull();
  });
});

describe('buildVehicleRanking', () => {
  it('sorts vehicles descending by km/L and assigns sequential 1-based positions', () => {
    const vehicles = [
      makeVehicleRow({vehicleId: 'v1', averageKmPerLiter: 8}),
      makeVehicleRow({vehicleId: 'v2', averageKmPerLiter: 12}),
      makeVehicleRow({vehicleId: 'v3', averageKmPerLiter: 10}),
    ];

    const ranking = buildVehicleRanking(vehicles);

    expect(ranking.map((row) => ({vehicleId: row.vehicleId, position: row.position}))).toEqual([
      {vehicleId: 'v2', position: 1},
      {vehicleId: 'v3', position: 2},
      {vehicleId: 'v1', position: 3},
    ]);
  });

  it('excludes vehicles without a valid km/L (no processed period)', () => {
    const vehicles = [
      makeVehicleRow({vehicleId: 'v1', averageKmPerLiter: 8}),
      makeVehicleRow({vehicleId: 'v2', averageKmPerLiter: null, periodCount: 0}),
    ];

    const ranking = buildVehicleRanking(vehicles);

    expect(ranking).toHaveLength(1);
    expect(ranking[0]?.vehicleId).toBe('v1');
  });

  it('annotates each row with its guarded operational distance share', () => {
    const vehicles = [
      makeVehicleRow({vehicleId: 'v1', operationalDistanceKm: 300, totalDistanceKm: 1000}),
    ];

    expect(buildVehicleRanking(vehicles)[0]?.operationalPercentage).toBe(30);
  });
});

describe('buildConsumptionAlerts', () => {
  it('flags a vehicle exactly 15% below the fleet average', () => {
    const fleet = makeFleetSummary({averageKmPerLiter: 10});
    const vehicles = [makeVehicleRow({vehicleId: 'v1', plate: 'DG500', averageKmPerLiter: 8.5})];

    const alerts = buildConsumptionAlerts(fleet, vehicles);

    expect(alerts).toContainEqual({
      type: 'below_average',
      vehicleId: 'v1',
      plate: 'DG500',
      kmPerLiter: 8.5,
      gapPercentage: 15,
    });
  });

  it('does not flag a vehicle just below the 15% gap threshold', () => {
    const fleet = makeFleetSummary({averageKmPerLiter: 10});
    const vehicles = [makeVehicleRow({vehicleId: 'v1', averageKmPerLiter: 8.6})];

    const alerts = buildConsumptionAlerts(fleet, vehicles);

    expect(alerts.some((alert) => alert.type === 'below_average')).toBe(false);
  });

  it('flags a vehicle whose operational distance share exceeds 25%', () => {
    const fleet = makeFleetSummary();
    const vehicles = [
      makeVehicleRow({
        vehicleId: 'v1',
        plate: 'DG500',
        operationalDistanceKm: 260,
        totalDistanceKm: 1000,
      }),
    ];

    const alerts = buildConsumptionAlerts(fleet, vehicles);

    expect(alerts).toContainEqual({
      type: 'high_operational',
      vehicleId: 'v1',
      plate: 'DG500',
      operationalPercentage: 26,
    });
  });

  it('does not flag a vehicle exactly at the 25% operational share threshold', () => {
    const fleet = makeFleetSummary();
    const vehicles = [makeVehicleRow({vehicleId: 'v1', operationalDistanceKm: 250, totalDistanceKm: 1000})];

    const alerts = buildConsumptionAlerts(fleet, vehicles);

    expect(alerts.some((alert) => alert.type === 'high_operational')).toBe(false);
  });

  it('flags vehicles with no processed consumption period', () => {
    const fleet = makeFleetSummary();
    const vehicles = [makeVehicleRow({vehicleId: 'v1', plate: 'NOFUEL', periodCount: 0, averageKmPerLiter: null})];

    const alerts = buildConsumptionAlerts(fleet, vehicles);

    expect(alerts).toContainEqual({type: 'no_consumption', vehicleId: 'v1', plate: 'NOFUEL'});
  });

  it('returns no alerts for a healthy fleet', () => {
    const fleet = makeFleetSummary({averageKmPerLiter: 10});
    const vehicles = [makeVehicleRow({vehicleId: 'v1', averageKmPerLiter: 10})];

    expect(buildConsumptionAlerts(fleet, vehicles)).toEqual([]);
  });
});
