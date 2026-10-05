import {describe, expect, it} from 'vitest';

import {mapTripRow} from '../../services/mappers';
import {
  computeTripActualDistanceKm,
  resolveTripOperationalDistanceKm,
  resolveTripPlannedDistanceKm,
} from '../trip-distance';

describe('Audit #17 — computeTripActualDistanceKm (KM real)', () => {
  it('valid odometer: final − initial', () => {
    expect(computeTripActualDistanceKm(1000, 1250)).toBe(250);
    expect(computeTripActualDistanceKm('1000.5', '1100.5')).toBe(100);
  });

  it('missing odometer: null', () => {
    expect(computeTripActualDistanceKm(null, 100)).toBeNull();
    expect(computeTripActualDistanceKm(100, null)).toBeNull();
    expect(computeTripActualDistanceKm(undefined, undefined)).toBeNull();
  });

  it('invalid odometer (non-numeric / non-finite / blank): null', () => {
    expect(computeTripActualDistanceKm('abc', 100)).toBeNull();
    expect(computeTripActualDistanceKm(100, Number.NaN)).toBeNull();
    expect(computeTripActualDistanceKm(100, Number.POSITIVE_INFINITY)).toBeNull();
    expect(computeTripActualDistanceKm('  ', 100)).toBeNull();
  });

  it('negative delta: null (invalid)', () => {
    expect(computeTripActualDistanceKm(500, 400)).toBeNull();
  });

  it('zero delta: 0 (valid reading, no distance)', () => {
    expect(computeTripActualDistanceKm(100, 100)).toBe(0);
  });
});

describe('Audit #17 — resolveTripPlannedDistanceKm (KM planejado)', () => {
  it('keeps valid planned km', () => {
    expect(resolveTripPlannedDistanceKm(480)).toBe(480);
    expect(resolveTripPlannedDistanceKm(0)).toBe(0);
  });

  it('rejects missing, invalid and negative planned km', () => {
    expect(resolveTripPlannedDistanceKm(null)).toBeNull();
    expect(resolveTripPlannedDistanceKm(Number.NaN)).toBeNull();
    expect(resolveTripPlannedDistanceKm(-1)).toBeNull();
  });
});

describe('Audit #17 — resolveTripOperationalDistanceKm (DRE / rateio)', () => {
  it('planned differs from real: real km wins', () => {
    expect(
      resolveTripOperationalDistanceKm({
        initialOdometerKm: 1000,
        finalOdometerKm: 1100,
        plannedDistanceKm: 900,
      }),
    ).toBe(100);
  });

  it('missing odometer: existing fallback to planned km', () => {
    expect(
      resolveTripOperationalDistanceKm({
        initialOdometerKm: null,
        finalOdometerKm: 5000,
        plannedDistanceKm: 200,
      }),
    ).toBe(200);
  });

  it('invalid / negative odometer: falls back to planned, never negative', () => {
    expect(
      resolveTripOperationalDistanceKm({
        initialOdometerKm: 500,
        finalOdometerKm: 400,
        plannedDistanceKm: 120,
      }),
    ).toBe(120);
    expect(
      resolveTripOperationalDistanceKm({
        initialOdometerKm: 'abc',
        finalOdometerKm: 400,
        plannedDistanceKm: 80,
      }),
    ).toBe(80);
  });

  it('zero real km: existing fallback to planned km', () => {
    expect(
      resolveTripOperationalDistanceKm({
        initialOdometerKm: 3000,
        finalOdometerKm: 3000,
        plannedDistanceKm: 50,
      }),
    ).toBe(50);
  });

  it('no valid odometer and no valid planned: 0', () => {
    expect(
      resolveTripOperationalDistanceKm({
        initialOdometerKm: null,
        finalOdometerKm: null,
        plannedDistanceKm: null,
      }),
    ).toBe(0);
    expect(
      resolveTripOperationalDistanceKm({
        initialOdometerKm: 500,
        finalOdometerKm: 400,
        plannedDistanceKm: -10,
      }),
    ).toBe(0);
  });
});

describe('Audit #17 — trip mapper keeps real and planned km separate', () => {
  function tripRow(overrides: Record<string, unknown>) {
    return {
      id: 'trip-1',
      company_id: 'company-1',
      trip_number: 'VG-1',
      trip_status: 'completed',
      initial_odometer_km: 1000,
      final_odometer_km: 1250,
      planned_distance_km: 480,
      initial_hour_meter: null,
      final_hour_meter: null,
      contracted_freight_value: null,
      actual_freight_value: null,
      freight_margin: null,
      weight_kg: null,
      volume_m3: null,
      lead_time_minutes: null,
      unload_time_minutes: null,
      ...overrides,
    } as never;
  }

  it('completed trip: distanceKm = odometer delta, plannedDistanceKm preserved', () => {
    const trip = mapTripRow(tripRow({}));
    expect(trip.distanceKm).toBe(250);
    expect(trip.plannedDistanceKm).toBe(480);
  });

  it('trip not completed (no final odometer): no invented real km', () => {
    const trip = mapTripRow(
      tripRow({trip_status: 'in_progress', final_odometer_km: null}),
    );
    expect(trip.distanceKm).toBeNull();
    expect(trip.plannedDistanceKm).toBe(480);
  });
});
