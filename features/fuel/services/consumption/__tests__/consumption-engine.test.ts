import type {SupabaseClient} from '@supabase/supabase-js';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {
  getTripOdometerForConsumption,
  listVehicleCompletedTripsForConsumption,
  listVehicleFuelRecordsForConsumption,
} from '../../../queries/consumption-queries';
import {calculateConsumptionPeriod, calculateTripConsumption} from '../consumption-engine';
import {makeFuelRecord, makeTripOdometer, makeVehicleTrip} from './fixtures';

vi.mock('../../../queries/consumption-queries', () => ({
  getTripOdometerForConsumption: vi.fn(),
  listVehicleCompletedTripsForConsumption: vi.fn(),
  listVehicleFuelRecordsForConsumption: vi.fn(),
}));

const supabase = {} as SupabaseClient;
const companyId = 'company-1';
const vehicleId = 'vehicle-1';

const mockGetTrip = vi.mocked(getTripOdometerForConsumption);
const mockListTrips = vi.mocked(listVehicleCompletedTripsForConsumption);
const mockListFuelRecords = vi.mocked(listVehicleFuelRecordsForConsumption);

describe('calculateConsumptionPeriod', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns no periods for a single fuel record', async () => {
    mockListFuelRecords.mockResolvedValue([makeFuelRecord()]);

    await expect(calculateConsumptionPeriod(supabase, companyId, vehicleId)).resolves.toEqual([]);
  });

  it('calculates the period between two consecutive fuel records', async () => {
    mockListFuelRecords.mockResolvedValue([
      makeFuelRecord({id: 'fuel-start', odometerKm: 100_000}),
      makeFuelRecord({
        id: 'fuel-end',
        odometerKm: 101_000,
        quantityLiters: 200,
        totalAmount: 1_200,
        fueledAt: '2026-01-02T10:00:00.000Z',
      }),
    ]);

    const result = await calculateConsumptionPeriod(supabase, companyId, vehicleId);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      startFuelRecordId: 'fuel-start',
      endFuelRecordId: 'fuel-end',
      distanceKm: 1_000,
      litersConsumed: 200,
      kmPerLiter: 5,
    });
  });

  it('ignores a pair with zero distance', async () => {
    mockListFuelRecords.mockResolvedValue([
      makeFuelRecord({id: 'fuel-start'}),
      makeFuelRecord({id: 'fuel-end', fueledAt: '2026-01-02T10:00:00.000Z'}),
    ]);

    await expect(calculateConsumptionPeriod(supabase, companyId, vehicleId)).resolves.toEqual([]);
  });

  it('ignores a pair with negative distance', async () => {
    mockListFuelRecords.mockResolvedValue([
      makeFuelRecord({id: 'fuel-start', odometerKm: 101_000}),
      makeFuelRecord({
        id: 'fuel-end',
        odometerKm: 100_000,
        fueledAt: '2026-01-02T10:00:00.000Z',
      }),
    ]);

    await expect(calculateConsumptionPeriod(supabase, companyId, vehicleId)).resolves.toEqual([]);
  });

  it('ignores a period closed by a zero-liter fuel record', async () => {
    mockListFuelRecords.mockResolvedValue([
      makeFuelRecord({id: 'fuel-start'}),
      makeFuelRecord({
        id: 'fuel-end',
        odometerKm: 101_000,
        quantityLiters: 0,
        totalAmount: 0,
        fueledAt: '2026-01-02T10:00:00.000Z',
      }),
    ]);

    await expect(calculateConsumptionPeriod(supabase, companyId, vehicleId)).resolves.toEqual([]);
  });
});

describe('calculateTripConsumption', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('combines proportional consumption from both periods crossed by a trip', async () => {
    mockGetTrip.mockResolvedValue(
      makeTripOdometer({initialOdometerKm: 100_250, finalOdometerKm: 100_750}),
    );
    mockListFuelRecords.mockResolvedValue([
      makeFuelRecord({id: 'fuel-a', odometerKm: 100_000}),
      makeFuelRecord({
        id: 'fuel-b',
        odometerKm: 100_500,
        quantityLiters: 100,
        totalAmount: 600,
        fueledAt: '2026-01-02T10:00:00.000Z',
      }),
      makeFuelRecord({
        id: 'fuel-c',
        odometerKm: 101_000,
        quantityLiters: 150,
        totalAmount: 900,
        fueledAt: '2026-01-03T10:00:00.000Z',
      }),
    ]);
    mockListTrips.mockResolvedValue([
      makeVehicleTrip({initialOdometerKm: 100_250, finalOdometerKm: 100_750}),
    ]);

    const result = await calculateTripConsumption(supabase, companyId, 'trip-1');

    expect(result).not.toBeNull();
    expect(result?.sourcePeriodIds).toEqual(['fuel-a:fuel-b', 'fuel-b:fuel-c']);
    expect(result?.metrics).toMatchObject({
      tripId: 'trip-1',
      periodId: null,
      distanceKm: 500,
      distanceShare: 1,
      estimatedLiters: 125,
      estimatedCost: 750,
      consumptionPercentage: 100,
    });
    expect(result?.metrics.kmPerLiter).toBe(4);
    expect(result?.metrics.costPerKm).toBe(1.5);
  });

  it.each([
    {name: 'is missing', trip: null},
    {name: 'is not completed', trip: makeTripOdometer({tripStatus: 'in_progress'})},
    {name: 'has no vehicle', trip: makeTripOdometer({vehicleId: null})},
    {name: 'has no initial odometer', trip: makeTripOdometer({initialOdometerKm: null})},
    {name: 'has no final odometer', trip: makeTripOdometer({finalOdometerKm: null})},
    {
      name: 'has a non-positive odometer range',
      trip: makeTripOdometer({initialOdometerKm: 101_000, finalOdometerKm: 100_000}),
    },
  ])('returns null when the trip $name', async ({trip}) => {
    mockGetTrip.mockResolvedValue(trip);

    await expect(calculateTripConsumption(supabase, companyId, 'trip-1')).resolves.toBeNull();
    expect(mockListFuelRecords).not.toHaveBeenCalled();
    expect(mockListTrips).not.toHaveBeenCalled();
  });

  it('returns null when the trip does not overlap any consumption period', async () => {
    mockGetTrip.mockResolvedValue(
      makeTripOdometer({initialOdometerKm: 102_000, finalOdometerKm: 103_000}),
    );
    mockListFuelRecords.mockResolvedValue([
      makeFuelRecord({id: 'fuel-a', odometerKm: 100_000}),
      makeFuelRecord({
        id: 'fuel-b',
        odometerKm: 101_000,
        fueledAt: '2026-01-02T10:00:00.000Z',
      }),
    ]);
    mockListTrips.mockResolvedValue([
      makeVehicleTrip({initialOdometerKm: 102_000, finalOdometerKm: 103_000}),
    ]);

    await expect(calculateTripConsumption(supabase, companyId, 'trip-1')).resolves.toBeNull();
  });
});
