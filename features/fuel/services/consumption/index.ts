export {calculateFuelMetrics} from './record-metrics';
export type {FuelMetricsInput, FuelMetricsResult} from './record-metrics';

export {
  calculateConsumptionPeriod,
  calculateTripConsumption,
  calculateVehicleConsumption,
  calculateVehicleConsumptionAllocations,
  calculateRouteConsumption,
  calculateDriverConsumption,
  calculateClientConsumption,
  reprocessVehicleConsumption,
} from './consumption-engine';

export {allocatePeriodConsumption, buildPeriodId} from './trip-allocation';

export {
  buildMonthlyConsumptionSeries,
  getFleetConsumptionSummary,
  getMonthlyConsumptionSeries,
  getVehicleConsumptionSummary,
  summarizeFleetConsumption,
  summarizeVehicleConsumption,
} from './consumption-summary';
