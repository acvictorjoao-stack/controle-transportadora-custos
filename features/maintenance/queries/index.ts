export {
  listMaintenanceRecords,
  getMaintenanceRecordById,
  createMaintenanceRecord,
  updateMaintenanceRecord,
  softDeleteMaintenanceRecord,
  getMaintenanceStats,
  listMaintenanceHistory,
  listMaintenanceDocuments,
  createMaintenanceDocument,
  softDeleteMaintenanceDocument,
  listMaintenanceParts,
  createMaintenancePart,
  updateMaintenancePart,
  softDeleteMaintenancePart,
  listMaintenanceServices,
  createMaintenanceService,
  updateMaintenanceService,
  softDeleteMaintenanceService,
  listMaintenanceSchedulesByVehicle,
  getMaintenanceRecordDetailRow,
} from './maintenance-records';

export {composeMaintenanceDetail as getMaintenanceDetail} from '../loaders/maintenance-detail-loader';
