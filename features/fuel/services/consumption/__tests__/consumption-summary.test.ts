import type {SupabaseClient} from '@supabase/supabase-js';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import type {ConsumptionAllocationResult, FuelConsumptionPeriod} from '../../../types';
import {calculateVehicleConsumptionAllocations} from '../consumption-engine';
import {
  buildMonthlyConsumptionSeries,
  getFleetConsumptionSummary,
  getMonthlyConsumptionSeries,
  getVehicleConsumptionSummary,
  summarizeFleetConsumption,
  summarizeVehicleConsumption,
} from '../consumption-summary';
import {makeConsumptionAllocationResult, makeConsumptionPeriod} from './fixtures';

vi.mock('../consumption-engine', () => ({
  calculateVehicleConsumptionAllocations: vi.fn(),
}));

const supabase = {} as SupabaseClient;
const companyId = 'company-1';
const mockCalculateAllocations = vi.mocked(calculateVehicleConsumptionAllocations);

function makeOperationalAllocation(
  periodOverrides: Partial<FuelConsumptionPeriod> = {},
): ConsumptionAllocationResult {
  const period = makeConsumptionPeriod(periodOverrides);

  return makeConsumptionAllocationResult({
    period,
    tripAllocations: [],
    operationalConsumption: {
      type: 'operational_consumption',
      periodId: `${period.startFuelRecordId}:${period.endFuelRecordId}`,
      vehicleId: period.vehicleId,
      distanceKm: period.distanceKm,
      distanceSharePercentage: 1,
      litersAllocated: period.litersConsumed,
      costAllocated: period.fuelCost,
      estimatedLiters: period.litersConsumed,
      estimatedCost: period.fuelCost,
      kmPerLiter: period.kmPerLiter,
      costPerKm: period.costPerKm,
      consumptionPercentage: 100,
      segments: [
        {
          startOdometer: period.startOdometer,
          endOdometer: period.endOdometer,
          distanceKm: period.distanceKm,
        },
      ],
    },
  });
}

describe('summarizeVehicleConsumption', () => {
  it('returns empty totals and null averages when the vehicle has no periods', () => {
    expect(summarizeVehicleConsumption('vehicle-1', [])).toEqual({
      vehicleId: 'vehicle-1',
      totalDistanceKm: 0,
      totalLiters: 0,
      totalFuelCost: 0,
      averageKmPerLiter: null,
      averageCostPerKm: null,
      operationalDistanceKm: 0,
      operationalLiters: 0,
      operationalFuelCost: 0,
      tripDistanceKm: 0,
      tripLiters: 0,
      tripFuelCost: 0,
      periodCount: 0,
    });
  });

  it('separates operational totals from trip totals', () => {
    const operational = makeOperationalAllocation();
    const trip = makeConsumptionAllocationResult({
      period: makeConsumptionPeriod({
        startFuelRecordId: 'fuel-end',
        endFuelRecordId: 'fuel-next',
        startOdometer: 101_000,
        endOdometer: 101_500,
        distanceKm: 500,
        litersConsumed: 50,
        fuelCost: 400,
        kmPerLiter: 10,
        costPerKm: 0.8,
        periodStart: '2026-01-02T10:00:00.000Z',
        periodEnd: '2026-01-03T10:00:00.000Z',
      }),
    });

    expect(summarizeVehicleConsumption('vehicle-1', [operational, trip])).toMatchObject({
      totalDistanceKm: 1_500,
      totalLiters: 250,
      totalFuelCost: 1_600,
      operationalDistanceKm: 1_000,
      operationalLiters: 200,
      operationalFuelCost: 1_200,
      tripDistanceKm: 500,
      tripLiters: 50,
      tripFuelCost: 400,
      periodCount: 2,
      averageKmPerLiter: 6,
      averageCostPerKm: 1.0666666666666667,
    });
  });

  it('derives averages from consolidated totals instead of period-level averages', () => {
    const inefficient = makeConsumptionAllocationResult({
      period: makeConsumptionPeriod({
        distanceKm: 100,
        litersConsumed: 100,
        fuelCost: 1_000,
        kmPerLiter: 1,
        costPerKm: 10,
      }),
    });
    const efficient = makeConsumptionAllocationResult({
      period: makeConsumptionPeriod({
        startFuelRecordId: 'fuel-second-start',
        endFuelRecordId: 'fuel-second-end',
        distanceKm: 900,
        litersConsumed: 100,
        fuelCost: 900,
        kmPerLiter: 9,
        costPerKm: 1,
      }),
    });

    const summary = summarizeVehicleConsumption('vehicle-1', [inefficient, efficient]);

    expect(summary.averageKmPerLiter).toBe(5);
    expect(summary.averageCostPerKm).toBe(1.9);
  });
});

describe('summarizeFleetConsumption', () => {
  it('rolls up populated vehicles and excludes empty histories from the vehicle count', () => {
    const vehicleOne = summarizeVehicleConsumption('vehicle-1', [makeOperationalAllocation()]);
    const vehicleTwo = summarizeVehicleConsumption(
      'vehicle-2',
      [
        makeConsumptionAllocationResult({
          period: makeConsumptionPeriod({
            vehicleId: 'vehicle-2',
            distanceKm: 500,
            litersConsumed: 50,
            fuelCost: 400,
            kmPerLiter: 10,
            costPerKm: 0.8,
          }),
        }),
      ],
    );
    const emptyVehicle = summarizeVehicleConsumption('vehicle-3', []);

    expect(summarizeFleetConsumption([vehicleOne, vehicleTwo, emptyVehicle])).toEqual({
      totalVehicles: 2,
      totalDistanceKm: 1_500,
      totalLiters: 250,
      totalFuelCost: 1_600,
      averageKmPerLiter: 6,
      averageCostPerKm: 1.0666666666666667,
      operationalDistanceKm: 1_000,
      operationalFuelCost: 1_200,
    });
  });
});

describe('buildMonthlyConsumptionSeries', () => {
  const january = makeConsumptionAllocationResult({
    period: makeConsumptionPeriod({
      distanceKm: 300,
      litersConsumed: 60,
      fuelCost: 420,
      periodStart: '2026-01-20T10:00:00.000Z',
      periodEnd: '2026-01-31T10:00:00.000Z',
    }),
  });
  const februaryOne = makeConsumptionAllocationResult({
    period: makeConsumptionPeriod({
      startFuelRecordId: 'fuel-feb-start',
      endFuelRecordId: 'fuel-feb-end',
      distanceKm: 200,
      litersConsumed: 40,
      fuelCost: 320,
      periodStart: '2026-01-31T10:00:00.000Z',
      periodEnd: '2026-02-03T10:00:00.000Z',
    }),
  });
  const februaryTwo = makeConsumptionAllocationResult({
    period: makeConsumptionPeriod({
      startFuelRecordId: 'fuel-feb-second-start',
      endFuelRecordId: 'fuel-feb-second-end',
      distanceKm: 500,
      litersConsumed: 100,
      fuelCost: 700,
      periodStart: '2026-02-03T10:00:00.000Z',
      periodEnd: '2026-02-28T10:00:00.000Z',
    }),
  });

  it('groups by closing month, consolidates each bucket and sorts chronologically', () => {
    expect(buildMonthlyConsumptionSeries([februaryTwo, january, februaryOne])).toEqual([
      {
        month: '2026-01',
        distanceKm: 300,
        liters: 60,
        fuelCost: 420,
        kmPerLiter: 5,
        costPerKm: 1.4,
      },
      {
        month: '2026-02',
        distanceKm: 700,
        liters: 140,
        fuelCost: 1_020,
        kmPerLiter: 5,
        costPerKm: 1.457142857142857,
      },
    ]);
  });

  it('filters month buckets inclusively', () => {
    expect(
      buildMonthlyConsumptionSeries([january, februaryOne, februaryTwo], {
        fromMonth: '2026-02',
        toMonth: '2026-02',
      }),
    ).toEqual([
      {
        month: '2026-02',
        distanceKm: 700,
        liters: 140,
        fuelCost: 1_020,
        kmPerLiter: 5,
        costPerKm: 1.457142857142857,
      },
    ]);
  });
});

describe('summary read-model façades', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('delegates vehicle and monthly summaries exclusively to engine allocations', async () => {
    const allocations = [makeOperationalAllocation()];
    mockCalculateAllocations.mockResolvedValue(allocations);

    const vehicle = await getVehicleConsumptionSummary(supabase, companyId, 'vehicle-1');
    const monthly = await getMonthlyConsumptionSeries(supabase, companyId, 'vehicle-1');

    expect(mockCalculateAllocations).toHaveBeenNthCalledWith(1, supabase, companyId, 'vehicle-1');
    expect(mockCalculateAllocations).toHaveBeenNthCalledWith(2, supabase, companyId, 'vehicle-1');
    expect(vehicle.totalDistanceKm).toBe(1_000);
    expect(monthly).toHaveLength(1);
  });

  it('delegates each supplied vehicle ID when summarizing a fleet', async () => {
    mockCalculateAllocations
      .mockResolvedValueOnce([makeOperationalAllocation()])
      .mockResolvedValueOnce([]);

    const fleet = await getFleetConsumptionSummary(supabase, companyId, ['vehicle-1', 'vehicle-2']);

    expect(mockCalculateAllocations).toHaveBeenCalledTimes(2);
    expect(fleet.totalVehicles).toBe(1);
    expect(fleet.totalDistanceKm).toBe(1_000);
  });
});
