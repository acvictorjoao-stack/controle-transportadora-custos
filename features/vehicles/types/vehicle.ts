import type {EntityStatus} from '@/features/organization/companies/types';

import type {
  VEHICLE_ASSET_STATUSES,
  VEHICLE_BODY_TYPE_OPTIONS,
  VEHICLE_FUEL_TYPES,
  VEHICLE_TYPE_OPTIONS,
} from '../constants/enums';
import type {VehicleIntegrationSections, VehicleMileageRecord} from './integrations';

export type VehicleAssetStatus = (typeof VEHICLE_ASSET_STATUSES)[number];

export type VehicleFuelType = (typeof VEHICLE_FUEL_TYPES)[number];

export type VehicleBodyType = (typeof VEHICLE_BODY_TYPE_OPTIONS)[number];

export interface VehicleRow {
  id: string;
  company_id: string;
  branch_id: string | null;
  plate: string;
  fleet_number: string | null;
  vehicle_type: string;
  body_type: VehicleBodyType | null;
  brand: string | null;
  model: string | null;
  year: number | null;
  renavam: string | null;
  chassis: string | null;
  color: string | null;
  fuel_type: VehicleFuelType | null;
  load_capacity_kg: number | null;
  gross_weight_kg: number | null;
  tare_kg: number | null;
  axles: number | null;
  initial_odometer_km: number;
  current_odometer_km: number;
  hour_meter: number | null;
  asset_status: VehicleAssetStatus;
  photo_url: string | null;
  crlv_url: string | null;
  photo_storage_path: string | null;
  crlv_storage_path: string | null;
  external_id: string | null;
  integration_source: string | null;
  metadata: Record<string, unknown>;
  status: EntityStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  branches?: {id: string; name: string; code: string} | {id: string; name: string; code: string}[] | null;
}

export interface Vehicle {
  id: string;
  companyId: string;
  branchId: string | null;
  branchName: string | null;
  plate: string;
  fleetNumber: string | null;
  vehicleType: string;
  bodyType: VehicleBodyType | null;
  brand: string | null;
  model: string | null;
  year: number | null;
  renavam: string | null;
  chassis: string | null;
  color: string | null;
  fuelType: VehicleFuelType | null;
  loadCapacityKg: number | null;
  grossWeightKg: number | null;
  tareKg: number | null;
  axles: number | null;
  initialOdometerKm: number;
  currentOdometerKm: number;
  hourMeter: number | null;
  assetStatus: VehicleAssetStatus;
  photoUrl: string | null;
  crlvUrl: string | null;
  photoStoragePath: string | null;
  crlvStoragePath: string | null;
  externalId: string | null;
  integrationSource: string | null;
  metadata: Record<string, unknown>;
  status: EntityStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type VehicleSelectOption = Pick<Vehicle, 'id' | 'plate' | 'model'>;

export interface VehicleHistoryRow {
  id: string;
  company_id: string;
  vehicle_id: string;
  action: string;
  changes: Record<string, unknown>;
  previous_asset_status: VehicleAssetStatus | null;
  new_asset_status: VehicleAssetStatus | null;
  created_at: string;
  created_by: string | null;
}

export interface VehicleHistory {
  id: string;
  vehicleId: string;
  action: string;
  changes: Record<string, unknown>;
  previousAssetStatus: VehicleAssetStatus | null;
  newAssetStatus: VehicleAssetStatus | null;
  createdAt: string;
  createdBy: string | null;
}

export interface VehicleDocumentRow {
  id: string;
  company_id: string;
  vehicle_id: string;
  name: string;
  file_url: string;
  storage_path: string | null;
  document_type: string;
  mime_type: string | null;
  file_size: number | null;
  created_at: string;
  deleted_at: string | null;
  created_by: string | null;
}

export interface VehicleDocument {
  id: string;
  vehicleId: string;
  name: string;
  fileUrl: string;
  storagePath: string | null;
  documentType: string;
  mimeType: string | null;
  fileSize: number | null;
  createdAt: string;
}

export interface PaginatedVehicles {
  items: Vehicle[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface VehicleListFilters {
  plate?: string;
  fleetNumber?: string;
  assetStatus?: VehicleAssetStatus;
  branchId?: string;
  vehicleType?: string;
  brand?: string;
}

export interface VehicleSortOptions {
  sortBy?: 'plate' | 'fleet_number' | 'brand' | 'asset_status' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}

export interface VehicleStats {
  total: number;
  active: number;
  maintenance: number;
  inactive: number;
  sold: number;
  averageOdometerKm: number;
}

export interface VehicleDetailData extends VehicleIntegrationSections {
  vehicle: Vehicle;
  history: VehicleHistory[];
  documents: VehicleDocument[];
  mileage: VehicleMileageRecord[];
}

export const VEHICLE_ASSET_STATUS_LABELS: Record<VehicleAssetStatus, string> = {
  active: 'Ativo',
  maintenance: 'Manutenção',
  inactive: 'Inativo',
  sold: 'Vendido',
};

export const VEHICLE_FUEL_TYPE_LABELS: Record<VehicleFuelType, string> = {
  diesel: 'Diesel',
  gasoline: 'Gasolina',
  ethanol: 'Etanol',
  flex: 'Flex',
  gnv: 'GNV',
  electric: 'Elétrico',
  hybrid: 'Híbrido',
  other: 'Outro',
};

export {VEHICLE_BODY_TYPE_OPTIONS, VEHICLE_TYPE_OPTIONS} from '../constants/enums';
