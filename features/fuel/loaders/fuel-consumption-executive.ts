import type {
  FuelConsumptionAlert,
  FuelConsumptionFleetSummary,
  FuelConsumptionVehicleRow,
  FuelExecutiveIndicators,
  FuelExecutiveVehicleHighlight,
  FuelVehicleRankingRow,
} from '../types';

/**
 * Executive composition layer for the Fuel Consumption Dashboard (RC
 * 26.6.7): executive indicators, the vehicle efficiency ranking and smart
 * alerts.
 *
 * Every function here is pure and operates exclusively on
 * `FuelConsumptionFleetSummary` / `FuelConsumptionVehicleRow[]` — the same
 * read model `composeFuelConsumptionDashboard` already produces from
 * `ConsumptionSummary`. Nothing here queries the database, calls the
 * Consumption Engine, or recalculates `kmPerLiter`/`costPerKm`. The only
 * derived numbers are guarded shares/gaps of totals `ConsumptionSummary`
 * already exposes (`operationalDistanceKm` / `totalDistanceKm`,
 * `averageKmPerLiter` vs. the fleet average) — the same guarded-division
 * primitive used elsewhere in this loader layer.
 */

/** Vehicle km/L must be at least this many percentage points below the fleet average to alert. */
const BELOW_AVERAGE_GAP_THRESHOLD_PERCENTAGE = 15;

/** Vehicle operational distance share above this percentage triggers a "high operational consumption" alert. */
const HIGH_OPERATIONAL_THRESHOLD_PERCENTAGE = 25;

function calculateShare(part: number, total: number): number | null {
  return total > 0 ? (part / total) * 100 : null;
}

function toHighlight(
  vehicle: FuelConsumptionVehicleRow,
  value: number,
): FuelExecutiveVehicleHighlight {
  return {vehicleId: vehicle.vehicleId, plate: vehicle.plate, value};
}

function pickExtreme(
  vehicles: FuelConsumptionVehicleRow[],
  selectField: (vehicle: FuelConsumptionVehicleRow) => number | null,
  comparator: (candidateValue: number, currentBestValue: number) => boolean,
): FuelExecutiveVehicleHighlight | null {
  let best: {vehicle: FuelConsumptionVehicleRow; value: number} | null = null;

  for (const vehicle of vehicles) {
    const value = selectField(vehicle);
    if (value === null) continue;

    if (best === null || comparator(value, best.value)) {
      best = {vehicle, value};
    }
  }

  return best ? toHighlight(best.vehicle, best.value) : null;
}

/**
 * Builds the "Indicadores Executivos" section data: best/worst efficiency,
 * highest/lowest cost vehicles, and the fleet's operational consumption
 * share. Vehicles with a `null` rate (no valid period) are excluded from
 * the extremes, exactly like the existing vehicle table already treats
 * `null` averages.
 */
export function buildExecutiveIndicators(
  fleet: FuelConsumptionFleetSummary,
  vehicles: FuelConsumptionVehicleRow[],
): FuelExecutiveIndicators {
  return {
    bestEfficiencyVehicle: pickExtreme(
      vehicles,
      (vehicle) => vehicle.averageKmPerLiter,
      (candidate, currentBest) => candidate > currentBest,
    ),
    worstEfficiencyVehicle: pickExtreme(
      vehicles,
      (vehicle) => vehicle.averageKmPerLiter,
      (candidate, currentBest) => candidate < currentBest,
    ),
    highestCostVehicle: pickExtreme(
      vehicles,
      (vehicle) => vehicle.averageCostPerKm,
      (candidate, currentBest) => candidate > currentBest,
    ),
    lowestCostVehicle: pickExtreme(
      vehicles,
      (vehicle) => vehicle.averageCostPerKm,
      (candidate, currentBest) => candidate < currentBest,
    ),
    operationalConsumptionPercentage: calculateShare(
      fleet.operationalDistanceKm,
      fleet.totalDistanceKm,
    ),
  };
}

/**
 * Builds the "Eficiência dos veículos" ranking: vehicles with a valid
 * `averageKmPerLiter`, sorted descending, each annotated with its 1-based
 * `position` and its operational distance share. Vehicles without a
 * processed period are left out — they are covered by the "sem consumo"
 * alert instead.
 */
export function buildVehicleRanking(
  vehicles: FuelConsumptionVehicleRow[],
): FuelVehicleRankingRow[] {
  return vehicles
    .filter((vehicle) => vehicle.averageKmPerLiter !== null)
    .sort((a, b) => (b.averageKmPerLiter as number) - (a.averageKmPerLiter as number))
    .map((vehicle, index) => ({
      ...vehicle,
      position: index + 1,
      operationalPercentage: calculateShare(vehicle.operationalDistanceKm, vehicle.totalDistanceKm),
    }));
}

function buildBelowAverageAlerts(
  fleet: FuelConsumptionFleetSummary,
  vehicles: FuelConsumptionVehicleRow[],
): FuelConsumptionAlert[] {
  if (fleet.averageKmPerLiter === null || fleet.averageKmPerLiter <= 0) return [];

  const alerts: FuelConsumptionAlert[] = [];

  for (const vehicle of vehicles) {
    if (vehicle.averageKmPerLiter === null) continue;

    const gapPercentage = calculateShare(
      fleet.averageKmPerLiter - vehicle.averageKmPerLiter,
      fleet.averageKmPerLiter,
    );

    if (gapPercentage !== null && gapPercentage >= BELOW_AVERAGE_GAP_THRESHOLD_PERCENTAGE) {
      alerts.push({
        type: 'below_average',
        vehicleId: vehicle.vehicleId,
        plate: vehicle.plate,
        kmPerLiter: vehicle.averageKmPerLiter,
        gapPercentage,
      });
    }
  }

  return alerts;
}

function buildHighOperationalAlerts(vehicles: FuelConsumptionVehicleRow[]): FuelConsumptionAlert[] {
  const alerts: FuelConsumptionAlert[] = [];

  for (const vehicle of vehicles) {
    const operationalPercentage = calculateShare(
      vehicle.operationalDistanceKm,
      vehicle.totalDistanceKm,
    );

    if (
      operationalPercentage !== null &&
      operationalPercentage > HIGH_OPERATIONAL_THRESHOLD_PERCENTAGE
    ) {
      alerts.push({
        type: 'high_operational',
        vehicleId: vehicle.vehicleId,
        plate: vehicle.plate,
        operationalPercentage,
      });
    }
  }

  return alerts;
}

function buildNoConsumptionAlerts(vehicles: FuelConsumptionVehicleRow[]): FuelConsumptionAlert[] {
  return vehicles
    .filter((vehicle) => vehicle.periodCount === 0)
    .map((vehicle) => ({
      type: 'no_consumption' as const,
      vehicleId: vehicle.vehicleId,
      plate: vehicle.plate,
    }));
}

/**
 * Builds the "Alertas" section data: vehicles below the fleet average by at
 * least `BELOW_AVERAGE_GAP_THRESHOLD_PERCENTAGE`, vehicles whose operational
 * distance share exceeds `HIGH_OPERATIONAL_THRESHOLD_PERCENTAGE`, and
 * vehicles with no processed consumption period.
 */
export function buildConsumptionAlerts(
  fleet: FuelConsumptionFleetSummary,
  vehicles: FuelConsumptionVehicleRow[],
): FuelConsumptionAlert[] {
  return [
    ...buildBelowAverageAlerts(fleet, vehicles),
    ...buildHighOperationalAlerts(vehicles),
    ...buildNoConsumptionAlerts(vehicles),
  ];
}
