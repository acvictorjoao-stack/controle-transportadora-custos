import type {FuelInconsistencyFlag} from '../types';

export interface FuelMetricsInput {
  quantityLiters: number;
  pricePerLiter: number;
  totalAmount: number;
  odometerKm: number | null;
  previousOdometerKm: number | null;
  fueledAt: string;
  tankCapacityLiters?: number | null;
  duplicateSameDay?: boolean;
}

export interface FuelMetricsResult {
  kmTraveled: number | null;
  consumptionLPer100km: number | null;
  kmPerLiter: number | null;
  costPerKm: number | null;
  autonomyKm: number | null;
  isInconsistent: boolean;
  inconsistencyFlags: FuelInconsistencyFlag[];
}

const AMOUNT_TOLERANCE = 0.05;
const MIN_KM_PER_LITER = 1;
const MAX_KM_PER_LITER = 30;

export function calculateFuelMetrics(input: FuelMetricsInput): FuelMetricsResult {
  const flags: FuelInconsistencyFlag[] = [];

  const fueledDate = new Date(input.fueledAt);
  if (fueledDate.getTime() > Date.now() + 60_000) {
    flags.push('future_date');
  }

  const expectedTotal = input.quantityLiters * input.pricePerLiter;
  if (Math.abs(expectedTotal - input.totalAmount) > AMOUNT_TOLERANCE) {
    flags.push('amount_mismatch');
  }

  if (input.duplicateSameDay) {
    flags.push('duplicate_same_day');
  }

  let kmTraveled: number | null = null;
  if (input.odometerKm !== null && input.previousOdometerKm !== null) {
    if (input.odometerKm < input.previousOdometerKm) {
      flags.push('odometer_decrease');
    } else {
      kmTraveled = input.odometerKm - input.previousOdometerKm;
    }
  } else if (input.previousOdometerKm !== null && input.odometerKm === null) {
    flags.push('odometer_missing');
  }

  let kmPerLiter: number | null = null;
  let consumptionLPer100km: number | null = null;
  let costPerKm: number | null = null;
  let autonomyKm: number | null = null;

  if (kmTraveled !== null && kmTraveled > 0 && input.quantityLiters > 0) {
    kmPerLiter = kmTraveled / input.quantityLiters;
    consumptionLPer100km = (input.quantityLiters / kmTraveled) * 100;
    costPerKm = input.totalAmount / kmTraveled;

    if (kmPerLiter < MIN_KM_PER_LITER || kmPerLiter > MAX_KM_PER_LITER) {
      flags.push('consumption_outlier');
    }

    if (input.tankCapacityLiters && input.tankCapacityLiters > 0 && kmPerLiter > 0) {
      autonomyKm = input.tankCapacityLiters * kmPerLiter;
    }
  }

  return {
    kmTraveled,
    consumptionLPer100km,
    kmPerLiter,
    costPerKm,
    autonomyKm,
    isInconsistent: flags.length > 0,
    inconsistencyFlags: flags,
  };
}
