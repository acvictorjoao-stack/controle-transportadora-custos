export {
  countVehicles,
  createVehicle,
  createVehicleDocument,
  getVehicleById,
  getVehicleStats,
  listVehicleDocuments,
  listVehicleHistory,
  listVehicles,
  listVehiclesForSelect,
  softDeleteVehicle,
  softDeleteVehicleDocument,
  updateVehicle,
  updateVehicleAssetStatus,
  updateVehicleFileUrl,
} from './vehicles';

export {composeVehicleDetail as getVehicleDetail} from '../loaders';

export type {ListVehiclesOptions} from './vehicles';
