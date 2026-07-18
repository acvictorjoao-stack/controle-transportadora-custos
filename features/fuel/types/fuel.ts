import type {EntityStatus} from '@/features/organization/companies/types';

import type {
  FUEL_DOCUMENT_TYPES,
  FUEL_INCONSISTENCY_FLAGS,
  FUEL_TYPES,
} from '../constants/enums';
import type {FuelIntegrationSections} from './integrations';

export type FuelType = (typeof FUEL_TYPES)[number];

export type FuelDocumentType = (typeof FUEL_DOCUMENT_TYPES)[number];

export type FuelInconsistencyFlag = (typeof FUEL_INCONSISTENCY_FLAGS)[number];

export interface FuelRecordRow {
  id: string;
  company_id: string;
  branch_id: string | null;
  vehicle_id: string;
  driver_id: string;
  trip_id: string | null;
  station_name: string | null;
  station_brand: string | null;
  city: string | null;
  state: string | null;
  fueled_at: string;
  fuel_type: FuelType;
  quantity_liters: number;
  price_per_liter: number;
  total_amount: number;
  odometer_km: number | null;
  hour_meter: number | null;
  km_traveled: number | null;
  consumption_l_per_100km: number | null;
  km_per_liter: number | null;
  cost_per_km: number | null;
  autonomy_km: number | null;
  notes: string | null;
  responsible: string | null;
  is_inconsistent: boolean;
  inconsistency_flags: FuelInconsistencyFlag[];
  external_id: string | null;
  integration_source: string | null;
  metadata: Record<string, unknown>;
  status: EntityStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  branches?: {id: string; name: string; code: string} | {id: string; name: string; code: string}[] | null;
  vehicles?: {id: string; plate: string; model: string | null; fuel_type?: FuelType; tank_capacity_liters?: number | null} | {id: string; plate: string; model: string | null; fuel_type?: FuelType; tank_capacity_liters?: number | null}[] | null;
  drivers?: {id: string; name: string; cpf?: string} | {id: string; name: string; cpf?: string}[] | null;
  trips?: {id: string; trip_number: string; origin?: string | null; destination?: string | null; trip_status?: string} | {id: string; trip_number: string; origin?: string | null; destination?: string | null; trip_status?: string}[] | null;
}

export interface FuelRecord {
  id: string;
  companyId: string;
  branchId: string | null;
  branchName: string | null;
  vehicleId: string;
  vehiclePlate: string | null;
  vehicleModel: string | null;
  driverId: string;
  driverName: string | null;
  tripId: string | null;
  tripNumber: string | null;
  stationName: string | null;
  stationBrand: string | null;
  city: string | null;
  state: string | null;
  fueledAt: string;
  fuelType: FuelType;
  quantityLiters: number;
  pricePerLiter: number;
  totalAmount: number;
  odometerKm: number | null;
  hourMeter: number | null;
  kmTraveled: number | null;
  consumptionLPer100km: number | null;
  kmPerLiter: number | null;
  costPerKm: number | null;
  autonomyKm: number | null;
  notes: string | null;
  responsible: string | null;
  isInconsistent: boolean;
  inconsistencyFlags: FuelInconsistencyFlag[];
  externalId: string | null;
  integrationSource: string | null;
  metadata: Record<string, unknown>;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface FuelHistoryRow {
  id: string;
  company_id: string;
  branch_id: string | null;
  vehicle_id: string | null;
  driver_id: string | null;
  trip_id: string | null;
  fuel_record_id: string;
  action: string;
  changes: Record<string, unknown>;
  created_at: string;
  created_by: string | null;
}

export interface FuelHistory {
  id: string;
  fuelRecordId: string;
  action: string;
  changes: Record<string, unknown>;
  createdAt: string;
  createdBy: string | null;
}

export interface FuelDocumentRow {
  id: string;
  company_id: string;
  fuel_record_id: string;
  name: string;
  file_url: string;
  storage_path: string | null;
  document_type: FuelDocumentType;
  mime_type: string | null;
  file_size: number | null;
  created_at: string;
  deleted_at: string | null;
  created_by: string | null;
}

export interface FuelDocument {
  id: string;
  fuelRecordId: string;
  name: string;
  fileUrl: string;
  storagePath: string | null;
  documentType: FuelDocumentType;
  mimeType: string | null;
  fileSize: number | null;
  createdAt: string;
}

export interface PaginatedFuelRecords {
  items: FuelRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface FuelListFilters {
  vehicleId?: string;
  driverId?: string;
  branchId?: string;
  fuelType?: FuelType;
  city?: string;
  stationName?: string;
  dateFrom?: string;
  dateTo?: string;
  inconsistentOnly?: boolean;
}

export interface FuelSortOptions {
  sortBy?: 'fueled_at' | 'total_amount' | 'quantity_liters' | 'km_per_liter' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}

export interface FuelEfficiencyEntity {
  id: string;
  name: string;
  kmPerLiter: number;
}

export interface FuelStationRanking {
  stationName: string;
  refuelCount: number;
  totalSpent: number;
}

export interface FuelBrandRanking {
  stationBrand: string;
  refuelCount: number;
  totalSpent: number;
}

export interface FuelStats {
  total: number;
  totalLiters: number;
  totalAmount: number;
  averagePricePerLiter: number;
  averageConsumptionLPer100km: number;
  averageKmPerLiter: number;
  mostEconomicalVehicle: FuelEfficiencyEntity | null;
  leastEconomicalVehicle: FuelEfficiencyEntity | null;
  mostEconomicalDriver: FuelEfficiencyEntity | null;
  leastEconomicalDriver: FuelEfficiencyEntity | null;
  topStations: FuelStationRanking[];
  topBrands: FuelBrandRanking[];
  inconsistentCount: number;
}

export interface FuelDetailData extends FuelIntegrationSections {
  record: FuelRecord;
  history: FuelHistory[];
  documents: FuelDocument[];
}

export {
  FUEL_TYPE_LABELS,
  FUEL_DOCUMENT_TYPE_LABELS,
  FUEL_HISTORY_ACTION_LABELS,
  FUEL_INCONSISTENCY_LABELS,
} from '../utils/fuel-format';
