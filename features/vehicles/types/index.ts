export type {
  Vehicle,
  VehicleSelectOption,
  VehicleAssetStatus,
  VehicleBodyType,
  VehicleDetailData,
  VehicleDocument,
  VehicleDocumentRow,
  VehicleFuelType,
  VehicleHistory,
  VehicleHistoryRow,
  VehicleListFilters,
  VehicleRow,
  VehicleSortOptions,
  VehicleStats,
  PaginatedVehicles,
} from './vehicle';

export type {
  VehicleCostRecord,
  VehicleDriverAssignment,
  VehicleFuelRecord,
  VehicleIntegrationSections,
  VehicleMaintenanceRecord,
  VehicleMileageRecord,
  VehicleTireRecord,
  VehicleTripRecord,
} from './integrations';

export {
  VEHICLE_ASSET_STATUS_LABELS,
  VEHICLE_BODY_TYPE_OPTIONS,
  VEHICLE_FUEL_TYPE_LABELS,
  VEHICLE_TYPE_OPTIONS,
} from './vehicle';

export {emptyVehicleIntegrationSections} from './integrations';
