export {
  listFuelRecords,
  getFuelRecordById,
  createFuelRecord,
  updateFuelRecord,
  softDeleteFuelRecord,
  getFuelStats,
  listFuelHistory,
  listFuelDocuments,
  createFuelDocument,
  softDeleteFuelDocument,
  getFuelRecordDetailRow,
} from './fuel-records';

export {
  listVehicleFuelRecordsForConsumption,
  listVehicleCompletedTripsForConsumption,
  getVehicleCurrentOdometerForConsumption,
} from './consumption-queries';
export type {
  VehicleFuelRecordForConsumption,
  VehicleTripForConsumption,
} from './consumption-queries';

export {composeFuelDetail as getFuelDetail} from '../loaders/fuel-detail-loader';
