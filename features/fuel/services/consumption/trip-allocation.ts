import type {VehicleTripForConsumption} from '../../queries/consumption-queries';
import type {
  ConsumptionAllocationResult,
  FuelConsumptionPeriod,
  OperationalConsumptionAllocation,
  OperationalConsumptionSegment,
  TripConsumptionAllocation,
} from '../../types';

/**
 * Pure rateio (proportional allocation) math for the Fuel Consumption Engine
 * (RC 26.6.3). Nothing here performs I/O — every function is a plain
 * transformation over already-fetched `FuelConsumptionPeriod`s and trips, so
 * it can be reused (and unit tested) independently of Supabase.
 *
 * The core idea: a period's odometer window `[startOdometer, endOdometer)`
 * is partitioned into two kinds of segments that never overlap and always
 * cover the whole window —
 *   1. the (clipped) odometer range of every completed trip that overlaps
 *      the period;
 *   2. the remaining "gaps", attributed to Consumo Operacional.
 *
 * Because every allocation is `segmentDistanceKm * (period.total / period.distanceKm)`
 * and the segments exactly partition the period, the sum of every
 * allocation's liters/cost equals the period's totals to full
 * floating-point precision — no liter or currency unit is created or lost,
 * and nothing is rounded internally.
 */

interface OdometerRange {
  start: number;
  end: number;
}

/** Stable identifier correlating an allocation back to the period it came from. */
export function buildPeriodId(period: FuelConsumptionPeriod): string {
  return `${period.startFuelRecordId}:${period.endFuelRecordId}`;
}

/** Merges overlapping/adjacent odometer ranges into their union, sorted ascending. */
function mergeOdometerRanges(ranges: OdometerRange[]): OdometerRange[] {
  if (ranges.length === 0) {
    return [];
  }

  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: OdometerRange[] = [{...sorted[0]}];

  for (let i = 1; i < sorted.length; i += 1) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push({...current});
    }
  }

  return merged;
}

/** Computes the complement of `covered` inside `[windowStart, windowEnd)`. */
function computeGaps(windowStart: number, windowEnd: number, covered: OdometerRange[]): OdometerRange[] {
  const gaps: OdometerRange[] = [];
  let cursor = windowStart;

  for (const range of covered) {
    if (range.start > cursor) {
      gaps.push({start: cursor, end: range.start});
    }
    cursor = Math.max(cursor, range.end);
  }

  if (cursor < windowEnd) {
    gaps.push({start: cursor, end: windowEnd});
  }

  return gaps;
}

interface ClippedTrip {
  tripId: string;
  overlapStart: number;
  overlapEnd: number;
}

/**
 * Trips with a valid, positive odometer range, clipped to their
 * intersection with the period's odometer window, sorted by overlap start.
 * Trips that do not overlap the period at all are excluded.
 */
function clipTripsToPeriod(period: FuelConsumptionPeriod, trips: VehicleTripForConsumption[]): ClippedTrip[] {
  return trips
    .filter(
      (trip): trip is VehicleTripForConsumption & {initialOdometerKm: number; finalOdometerKm: number} =>
        trip.initialOdometerKm !== null &&
        trip.finalOdometerKm !== null &&
        trip.finalOdometerKm > trip.initialOdometerKm,
    )
    .map((trip) => ({
      tripId: trip.id,
      overlapStart: Math.max(trip.initialOdometerKm, period.startOdometer),
      overlapEnd: Math.min(trip.finalOdometerKm, period.endOdometer),
    }))
    .filter((clipped) => clipped.overlapEnd > clipped.overlapStart)
    .sort((a, b) => a.overlapStart - b.overlapStart);
}

/**
 * Rateia (proportionally allocates) one `FuelConsumptionPeriod`'s liters and
 * cost across every completed trip whose odometer range overlaps it, and
 * aggregates whatever kilometers are left over into a single Consumo
 * Operacional allocation.
 *
 * `trips` should be every completed trip of the period's vehicle (regardless
 * of whether they overlap this specific period) — callers typically fetch
 * them once per vehicle and call this function once per period.
 */
export function allocatePeriodConsumption(
  period: FuelConsumptionPeriod,
  trips: VehicleTripForConsumption[],
): ConsumptionAllocationResult {
  const periodId = buildPeriodId(period);
  const litersPerKm = period.litersConsumed / period.distanceKm;
  const costPerKm = period.fuelCost / period.distanceKm;

  const clippedTrips = clipTripsToPeriod(period, trips);
  const coveredRanges = mergeOdometerRanges(
    clippedTrips.map((trip) => ({start: trip.overlapStart, end: trip.overlapEnd})),
  );
  const gaps = computeGaps(period.startOdometer, period.endOdometer, coveredRanges);

  const tripAllocations: TripConsumptionAllocation[] = clippedTrips.map((trip) => {
    const distanceKm = trip.overlapEnd - trip.overlapStart;
    const distanceSharePercentage = distanceKm / period.distanceKm;
    const litersAllocated = distanceKm * litersPerKm;
    const costAllocated = distanceKm * costPerKm;

    return {
      tripId: trip.tripId,
      periodId,
      vehicleId: period.vehicleId,
      overlapStartOdometer: trip.overlapStart,
      overlapEndOdometer: trip.overlapEnd,
      distanceKm,
      distanceSharePercentage,
      litersAllocated,
      costAllocated,
      estimatedLiters: litersAllocated,
      estimatedCost: costAllocated,
      kmPerLiter: litersAllocated > 0 ? distanceKm / litersAllocated : null,
      costPerKm: distanceKm > 0 ? costAllocated / distanceKm : null,
      consumptionPercentage: distanceSharePercentage * 100,
    };
  });

  const operationalDistanceKm = gaps.reduce((sum, gap) => sum + (gap.end - gap.start), 0);
  let operationalConsumption: OperationalConsumptionAllocation | null = null;

  if (operationalDistanceKm > 0) {
    const distanceSharePercentage = operationalDistanceKm / period.distanceKm;
    const litersAllocated = operationalDistanceKm * litersPerKm;
    const costAllocated = operationalDistanceKm * costPerKm;
    const segments: OperationalConsumptionSegment[] = gaps.map((gap) => ({
      startOdometer: gap.start,
      endOdometer: gap.end,
      distanceKm: gap.end - gap.start,
    }));

    operationalConsumption = {
      type: 'operational_consumption',
      periodId,
      vehicleId: period.vehicleId,
      distanceKm: operationalDistanceKm,
      distanceSharePercentage,
      litersAllocated,
      costAllocated,
      estimatedLiters: litersAllocated,
      estimatedCost: costAllocated,
      kmPerLiter: litersAllocated > 0 ? operationalDistanceKm / litersAllocated : null,
      costPerKm: operationalDistanceKm > 0 ? costAllocated / operationalDistanceKm : null,
      consumptionPercentage: distanceSharePercentage * 100,
      segments,
    };
  }

  const totalAllocatedLiters =
    tripAllocations.reduce((sum, allocation) => sum + allocation.litersAllocated, 0) +
    (operationalConsumption?.litersAllocated ?? 0);
  const totalAllocatedCost =
    tripAllocations.reduce((sum, allocation) => sum + allocation.costAllocated, 0) +
    (operationalConsumption?.costAllocated ?? 0);

  return {
    period,
    tripAllocations,
    operationalConsumption,
    totalAllocatedLiters,
    totalAllocatedCost,
  };
}
