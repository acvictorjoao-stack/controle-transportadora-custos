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

export {composeFuelDetail as getFuelDetail} from '../loaders/fuel-detail-loader';
