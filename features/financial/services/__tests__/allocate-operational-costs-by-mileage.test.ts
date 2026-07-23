import {describe, expect, it} from 'vitest';

import {allocateOperationalCostsByMileage} from '../allocate-operational-costs-by-mileage';

describe('allocateOperationalCostsByMileage', () => {
  it('keeps full amount when expense has trip_id (direct link)', () => {
    const result = allocateOperationalCostsByMileage(
      [
        {
          id: 'e1',
          amount: 500,
          tripId: 'trip-a',
          vehicleId: 'vehicle-1',
        },
      ],
      [
        {tripId: 'trip-a', vehicleId: 'vehicle-1', distanceKm: 200},
        {tripId: 'trip-b', vehicleId: 'vehicle-1', distanceKm: 800},
      ],
    );

    expect(result.totalsByTripId.get('trip-a')).toBe(500);
    expect(result.totalsByTripId.get('trip-b')).toBeUndefined();
    expect(result.getForTrip('trip-a')[0]?.allocation).toBe('direct');
    expect(result.getForTrip('trip-a')[0]?.share).toBe(1);
  });

  it('allocates by mileage when expense has vehicle and no trip_id', () => {
    const result = allocateOperationalCostsByMileage(
      [
        {
          id: 'fuel',
          amount: 2000,
          tripId: null,
          vehicleId: 'vehicle-1',
        },
      ],
      [
        {tripId: 'trip-a', vehicleId: 'vehicle-1', distanceKm: 200},
        {tripId: 'trip-b', vehicleId: 'vehicle-1', distanceKm: 800},
      ],
    );

    expect(result.totalsByTripId.get('trip-a')).toBeCloseTo(400, 8);
    expect(result.totalsByTripId.get('trip-b')).toBeCloseTo(1600, 8);

    const tripA = result.getForTrip('trip-a')[0];
    expect(tripA?.allocation).toBe('mileage');
    expect(tripA?.share).toBeCloseTo(0.2, 8);
    expect(tripA?.vehicleTotalKm).toBe(1000);
    expect(tripA?.tripKm).toBe(200);
  });

  it('combines direct and mileage allocations for the same trip', () => {
    const result = allocateOperationalCostsByMileage(
      [
        {id: 'direct', amount: 100, tripId: 'trip-a', vehicleId: 'vehicle-1'},
        {id: 'shared', amount: 1000, tripId: null, vehicleId: 'vehicle-1'},
      ],
      [
        {tripId: 'trip-a', vehicleId: 'vehicle-1', distanceKm: 250},
        {tripId: 'trip-b', vehicleId: 'vehicle-1', distanceKm: 750},
      ],
    );

    expect(result.totalsByTripId.get('trip-a')).toBeCloseTo(350, 8);
    expect(result.totalsByTripId.get('trip-b')).toBeCloseTo(750, 8);
  });

  it('ignores expenses without trip and without vehicle', () => {
    const result = allocateOperationalCostsByMileage(
      [{id: 'orphan', amount: 999, tripId: null, vehicleId: null}],
      [{tripId: 'trip-a', vehicleId: 'vehicle-1', distanceKm: 100}],
    );

    expect(result.allocations).toHaveLength(0);
    expect(result.totalsByTripId.size).toBe(0);
  });

  it('skips mileage allocation when vehicle has zero total km', () => {
    const result = allocateOperationalCostsByMileage(
      [{id: 'fuel', amount: 2000, tripId: null, vehicleId: 'vehicle-1'}],
      [
        {tripId: 'trip-a', vehicleId: 'vehicle-1', distanceKm: 0},
        {tripId: 'trip-b', vehicleId: 'vehicle-1', distanceKm: -10},
      ],
    );

    expect(result.allocations).toHaveLength(0);
  });

  it('does not cross-allocate between different vehicles', () => {
    const result = allocateOperationalCostsByMileage(
      [{id: 'fuel', amount: 1000, tripId: null, vehicleId: 'vehicle-1'}],
      [
        {tripId: 'trip-a', vehicleId: 'vehicle-1', distanceKm: 100},
        {tripId: 'trip-b', vehicleId: 'vehicle-2', distanceKm: 100},
      ],
    );

    expect(result.totalsByTripId.get('trip-a')).toBe(1000);
    expect(result.totalsByTripId.get('trip-b')).toBeUndefined();
  });

  it('conserves the original amount across mileage shares', () => {
    const result = allocateOperationalCostsByMileage(
      [{id: 'maint', amount: 333, tripId: null, vehicleId: 'vehicle-1'}],
      [
        {tripId: 't1', vehicleId: 'vehicle-1', distanceKm: 10},
        {tripId: 't2', vehicleId: 'vehicle-1', distanceKm: 20},
        {tripId: 't3', vehicleId: 'vehicle-1', distanceKm: 30},
      ],
    );

    const allocated = result.allocations.reduce((sum, item) => sum + item.amount, 0);
    expect(allocated).toBeCloseTo(333, 10);
  });
});
