import type {
  TripOdometerForConsumption,
  VehicleFuelRecordForConsumption,
  VehicleTripForConsumption,
} from '../../../queries/consumption-queries';
import type {ConsumptionAllocationResult, FuelConsumptionPeriod} from '../../../types';

export function makeConsumptionPeriod(
  overrides: Partial<FuelConsumptionPeriod> = {},
): FuelConsumptionPeriod {
  return {
    vehicleId: 'vehicle-1',
    startFuelRecordId: 'fuel-start',
    endFuelRecordId: 'fuel-end',
    startOdometer: 100_000,
    endOdometer: 101_000,
    distanceKm: 1_000,
    litersConsumed: 200,
    fuelCost: 1_200,
    pricePerLiter: 6,
    kmPerLiter: 5,
    costPerKm: 1.2,
    periodStart: '2026-01-01T10:00:00.000Z',
    periodEnd: '2026-01-02T10:00:00.000Z',
    ...overrides,
  };
}

export function makeFuelRecord(
  overrides: Partial<VehicleFuelRecordForConsumption> = {},
): VehicleFuelRecordForConsumption {
  return {
    id: 'fuel-1',
    odometerKm: 100_000,
    quantityLiters: 100,
    totalAmount: 600,
    pricePerLiter: 6,
    fueledAt: '2026-01-01T10:00:00.000Z',
    ...overrides,
  };
}

export function makeVehicleTrip(
  overrides: Partial<VehicleTripForConsumption> = {},
): VehicleTripForConsumption {
  return {
    id: 'trip-1',
    initialOdometerKm: 100_000,
    finalOdometerKm: 101_000,
    routeId: null,
    customerId: null,
    driverId: null,
    ...overrides,
  };
}

export function makeTripOdometer(
  overrides: Partial<TripOdometerForConsumption> = {},
): TripOdometerForConsumption {
  return {
    id: 'trip-1',
    vehicleId: 'vehicle-1',
    tripStatus: 'completed',
    initialOdometerKm: 100_000,
    finalOdometerKm: 101_000,
    ...overrides,
  };
}

export function makeConsumptionAllocationResult(
  overrides: Partial<ConsumptionAllocationResult> = {},
): ConsumptionAllocationResult {
  const period = makeConsumptionPeriod(overrides.period);
  const tripAllocation = {
    tripId: 'trip-1',
    periodId: `${period.startFuelRecordId}:${period.endFuelRecordId}`,
    vehicleId: period.vehicleId,
    overlapStartOdometer: period.startOdometer,
    overlapEndOdometer: period.endOdometer,
    distanceKm: period.distanceKm,
    distanceSharePercentage: 1,
    litersAllocated: period.litersConsumed,
    costAllocated: period.fuelCost,
    estimatedLiters: period.litersConsumed,
    estimatedCost: period.fuelCost,
    kmPerLiter: period.kmPerLiter,
    costPerKm: period.costPerKm,
    consumptionPercentage: 100,
  };

  return {
    period,
    tripAllocations: [tripAllocation],
    operationalConsumption: null,
    totalAllocatedLiters: period.litersConsumed,
    totalAllocatedCost: period.fuelCost,
    ...overrides,
  };
}
