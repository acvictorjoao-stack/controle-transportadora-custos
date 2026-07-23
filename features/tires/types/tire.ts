import type {EntityStatus} from '@/features/organization/companies/types';

import type {
  TIRE_DOCUMENT_TYPES,
  TIRE_MOVEMENT_TYPES,
  TIRE_POSITIONS,
  TIRE_STATUSES,
  TIRE_WEAR_LEVELS,
} from '../constants/enums';
import type {TireIntegrationSections} from './integrations';

export type TireStatus = (typeof TIRE_STATUSES)[number];
export type TirePosition = (typeof TIRE_POSITIONS)[number];
export type TireMovementType = (typeof TIRE_MOVEMENT_TYPES)[number];
export type TireDocumentType = (typeof TIRE_DOCUMENT_TYPES)[number];
export type TireWearLevel = (typeof TIRE_WEAR_LEVELS)[number];

export interface TireRow {
  id: string;
  company_id: string;
  branch_id: string | null;
  vehicle_id: string | null;
  maintenance_record_id: string | null;
  asset_number: string | null;
  internal_code: string | null;
  brand: string | null;
  model: string | null;
  tire_size: string | null;
  manufacturer: string | null;
  dot_number: string | null;
  fire_number: string | null;
  serial_number: string | null;
  expected_life_km: number | null;
  current_km: number;
  accumulated_km: number;
  purchase_date: string | null;
  purchase_value: number | null;
  supplier_id: string | null;
  supplier: string | null;
  warranty: string | null;
  tire_status: TireStatus;
  current_position: TirePosition | null;
  notes: string | null;
  recap_count: number;
  total_recap_cost: number;
  remaining_life_km: number | null;
  cost_per_km: number | null;
  last_tread_depth_mm: number | null;
  payment_type: 'cash' | 'credit';
  payment_due_date: string | null;
  installment_count: number;
  installment_interval_days: number;
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
  vehicles?: {id: string; plate: string; model: string | null} | {id: string; plate: string; model: string | null}[] | null;
}

export interface Tire {
  id: string;
  companyId: string;
  branchId: string | null;
  branchName: string | null;
  vehicleId: string | null;
  vehiclePlate: string | null;
  vehicleModel: string | null;
  maintenanceRecordId: string | null;
  assetNumber: string | null;
  internalCode: string | null;
  brand: string | null;
  model: string | null;
  tireSize: string | null;
  manufacturer: string | null;
  dotNumber: string | null;
  fireNumber: string | null;
  serialNumber: string | null;
  expectedLifeKm: number | null;
  currentKm: number;
  accumulatedKm: number;
  purchaseDate: string | null;
  purchaseValue: number | null;
  supplierId: string | null;
  supplier: string | null;
  warranty: string | null;
  tireStatus: TireStatus;
  currentPosition: TirePosition | null;
  notes: string | null;
  recapCount: number;
  totalRecapCost: number;
  remainingLifeKm: number | null;
  costPerKm: number | null;
  lastTreadDepthMm: number | null;
  paymentType: 'cash' | 'credit';
  paymentDueDate: string | null;
  installmentCount: number;
  installmentIntervalDays: number;
  externalId: string | null;
  integrationSource: string | null;
  metadata: Record<string, unknown>;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TireHistoryRow {
  id: string;
  company_id: string;
  tire_id: string;
  action: string;
  changes: Record<string, unknown>;
  created_at: string;
  created_by: string | null;
}

export interface TireHistory {
  id: string;
  tireId: string;
  action: string;
  changes: Record<string, unknown>;
  createdAt: string;
  createdBy: string | null;
}

export interface TireMovementRow {
  id: string;
  company_id: string;
  branch_id?: string | null;
  vehicle_id: string | null;
  maintenance_record_id?: string | null;
  tire_id: string;
  movement_type: TireMovementType;
  position: TirePosition | null;
  installed_at: string | null;
  removed_at: string | null;
  reason: string | null;
  responsible: string | null;
  odometer_km: number | null;
  notes: string | null;
  created_at: string;
  deleted_at: string | null;
  vehicles?: {id: string; plate: string} | {id: string; plate: string}[] | null;
}

export interface TireMovement {
  id: string;
  tireId: string;
  vehicleId: string | null;
  vehiclePlate: string | null;
  movementType: TireMovementType;
  position: TirePosition | null;
  installedAt: string | null;
  removedAt: string | null;
  reason: string | null;
  responsible: string | null;
  odometerKm: number | null;
  notes: string | null;
  createdAt: string;
}

export interface TireInspectionRow {
  id: string;
  company_id: string;
  tire_id: string;
  tread_depth_mm: number | null;
  pressure_psi: number | null;
  wear_level: TireWearLevel | null;
  inspected_at: string;
  responsible: string | null;
  notes: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface TireInspection {
  id: string;
  tireId: string;
  treadDepthMm: number | null;
  pressurePsi: number | null;
  wearLevel: TireWearLevel | null;
  inspectedAt: string;
  responsible: string | null;
  notes: string | null;
  createdAt: string;
}

export interface TireRecapRow {
  id: string;
  company_id: string;
  tire_id: string;
  supplier_id: string | null;
  supplier: string | null;
  recap_number: string | null;
  amount: number | null;
  odometer_km: number | null;
  recapped_at: string;
  warranty: string | null;
  notes: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface TireRecap {
  id: string;
  tireId: string;
  supplierId: string | null;
  supplier: string | null;
  recapNumber: string | null;
  amount: number | null;
  odometerKm: number | null;
  recappedAt: string;
  warranty: string | null;
  notes: string | null;
  createdAt: string;
}

export interface TireDocumentRow {
  id: string;
  company_id: string;
  tire_id: string;
  name: string;
  file_url: string;
  storage_path: string | null;
  document_type: TireDocumentType;
  mime_type: string | null;
  file_size: number | null;
  created_at: string;
  deleted_at: string | null;
  created_by: string | null;
}

export interface TireDocument {
  id: string;
  tireId: string;
  name: string;
  fileUrl: string;
  storagePath: string | null;
  documentType: TireDocumentType;
  mimeType: string | null;
  fileSize: number | null;
  createdAt: string;
}

export interface PaginatedTires {
  items: Tire[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TireListFilters {
  vehicleId?: string;
  branchId?: string;
  tireStatus?: TireStatus;
  brand?: string;
  supplier?: string;
  position?: TirePosition;
  hasRecap?: boolean;
}

export interface TireSortOptions {
  sortBy?: 'created_at' | 'asset_number' | 'brand' | 'accumulated_km' | 'tire_status' | 'purchase_date';
  sortOrder?: 'asc' | 'desc';
}

export interface TireVehicleWearRanking {
  vehicleId: string;
  vehiclePlate: string;
  avgTreadMm: number;
  tireCount: number;
}

export interface TireStats {
  total: number;
  installed: number;
  inStock: number;
  discarded: number;
  inRetread: number;
  averageKm: number;
  averageCostPerKm: number;
  replacementDue: number;
  topVehiclesByWear: TireVehicleWearRanking[];
}

export interface TireDetailData extends TireIntegrationSections {
  tire: Tire;
  history: TireHistory[];
  movements: TireMovement[];
  inspections: TireInspection[];
  recaps: TireRecap[];
  documents: TireDocument[];
}
