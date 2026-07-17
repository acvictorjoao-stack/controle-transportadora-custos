export {calculateFuelMetrics} from './record-metrics';
export type {FuelMetricsInput, FuelMetricsResult} from './record-metrics';

export {
  calculateConsumptionPeriod,
  calculateTripConsumption,
  calculateVehicleConsumption,
  calculateRouteConsumption,
  calculateDriverConsumption,
  calculateClientConsumption,
  reprocessVehicleConsumption,
} from './consumption-engine';
