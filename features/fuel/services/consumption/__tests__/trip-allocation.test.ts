import {describe, expect, it} from 'vitest';

import {allocatePeriodConsumption} from '../trip-allocation';
import {makeConsumptionPeriod, makeVehicleTrip} from './fixtures';

describe('allocatePeriodConsumption', () => {
  it('allocates the entire period to operational consumption when there are no trips', () => {
    const period = makeConsumptionPeriod();

    const result = allocatePeriodConsumption(period, []);

    expect(result.tripAllocations).toEqual([]);
    expect(result.operationalConsumption).toMatchObject({
      type: 'operational_consumption',
      distanceKm: 1_000,
      litersAllocated: 200,
      costAllocated: 1_200,
      consumptionPercentage: 100,
    });
    expect(result.operationalConsumption?.segments).toEqual([
      {startOdometer: 100_000, endOdometer: 101_000, distanceKm: 1_000},
    ]);
    expect(result.totalAllocatedLiters).toBe(200);
    expect(result.totalAllocatedCost).toBe(1_200);
  });

  it('does not create operational consumption when consecutive trips cover the whole period', () => {
    const period = makeConsumptionPeriod();
    const trips = [
      makeVehicleTrip({id: 'trip-a', finalOdometerKm: 100_400}),
      makeVehicleTrip({id: 'trip-b', initialOdometerKm: 100_400}),
    ];

    const result = allocatePeriodConsumption(period, trips);

    expect(result.operationalConsumption).toBeNull();
    expect(result.tripAllocations.map((allocation) => allocation.distanceKm)).toEqual([400, 600]);
    expect(result.tripAllocations.map((allocation) => allocation.litersAllocated)).toEqual([80, 120]);
    expect(result.totalAllocatedLiters).toBe(200);
    expect(result.totalAllocatedCost).toBe(1_200);
  });

  it('allocates uncovered initial and final ranges to operational consumption', () => {
    const period = makeConsumptionPeriod();
    const trip = makeVehicleTrip({
      initialOdometerKm: 100_200,
      finalOdometerKm: 100_800,
    });

    const result = allocatePeriodConsumption(period, [trip]);

    expect(result.tripAllocations[0]).toMatchObject({
      distanceKm: 600,
      litersAllocated: 120,
      costAllocated: 720,
    });
    expect(result.operationalConsumption).toMatchObject({
      distanceKm: 400,
      litersAllocated: 80,
      costAllocated: 480,
    });
    expect(result.operationalConsumption?.segments).toEqual([
      {startOdometer: 100_000, endOdometer: 100_200, distanceKm: 200},
      {startOdometer: 100_800, endOdometer: 101_000, distanceKm: 200},
    ]);
  });

  it('conserves distance, liters and cost across several consecutive trips', () => {
    const period = makeConsumptionPeriod({litersConsumed: 250, fuelCost: 1_650});
    const trips = [
      makeVehicleTrip({id: 'trip-a', finalOdometerKm: 100_250}),
      makeVehicleTrip({id: 'trip-b', initialOdometerKm: 100_250, finalOdometerKm: 100_600}),
      makeVehicleTrip({id: 'trip-c', initialOdometerKm: 100_600}),
    ];

    const result = allocatePeriodConsumption(period, trips);
    const distance = result.tripAllocations.reduce((sum, allocation) => sum + allocation.distanceKm, 0);
    const liters = result.tripAllocations.reduce((sum, allocation) => sum + allocation.litersAllocated, 0);
    const cost = result.tripAllocations.reduce((sum, allocation) => sum + allocation.costAllocated, 0);

    expect(distance).toBe(1_000);
    expect(liters).toBeCloseTo(250, 12);
    expect(cost).toBeCloseTo(1_650, 12);
    expect(result.totalAllocatedLiters).toBeCloseTo(period.litersConsumed, 12);
    expect(result.totalAllocatedCost).toBeCloseTo(period.fuelCost, 12);
  });

  it.each([
    {
      name: 'starts before the period',
      trip: makeVehicleTrip({initialOdometerKm: 99_500, finalOdometerKm: 100_300}),
      expectedStart: 100_000,
      expectedEnd: 100_300,
      expectedDistance: 300,
    },
    {
      name: 'ends after the period',
      trip: makeVehicleTrip({initialOdometerKm: 100_700, finalOdometerKm: 101_500}),
      expectedStart: 100_700,
      expectedEnd: 101_000,
      expectedDistance: 300,
    },
  ])('uses only the trip intersection when it $name', ({trip, expectedStart, expectedEnd, expectedDistance}) => {
    const result = allocatePeriodConsumption(makeConsumptionPeriod(), [trip]);

    expect(result.tripAllocations[0]).toMatchObject({
      overlapStartOdometer: expectedStart,
      overlapEndOdometer: expectedEnd,
      distanceKm: expectedDistance,
      litersAllocated: 60,
    });
    expect(result.operationalConsumption?.distanceKm).toBe(700);
  });

  it('throws a descriptive invariant error when trip ranges overlap', () => {
    const period = makeConsumptionPeriod();
    const trips = [
      makeVehicleTrip({id: 'trip-a', finalOdometerKm: 100_600}),
      makeVehicleTrip({id: 'trip-b', initialOdometerKm: 100_500}),
    ];

    expect(() => allocatePeriodConsumption(period, trips)).toThrow(
      'Consumption allocation invariant failed for period fuel-start:fuel-end: distance',
    );
  });
});
