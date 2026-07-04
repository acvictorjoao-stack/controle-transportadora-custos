export type {
  Tire,
  TireDetailData,
  TireDocument,
  TireDocumentType,
  TireHistory,
  TireInspection,
  TireListFilters,
  TireMovement,
  TireMovementType,
  TirePosition,
  TireRecap,
  TireSortOptions,
  TireStats,
  TireStatus,
  TireVehicleWearRanking,
  TireWearLevel,
  PaginatedTires,
} from './tire';

export type {TireIntegrationSections} from './integrations';

export {
  TIRE_STATUS_LABELS,
  TIRE_POSITION_LABELS,
  TIRE_MOVEMENT_TYPE_LABELS,
  TIRE_DOCUMENT_TYPE_LABELS,
  TIRE_WEAR_LEVEL_LABELS,
  TIRE_HISTORY_ACTION_LABELS,
} from '../utils/tire-format';
