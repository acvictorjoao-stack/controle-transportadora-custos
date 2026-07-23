import type {EntityStatus} from '@/features/organization/companies/types';

import type {
  MAINTENANCE_ALERT_TYPES,
  MAINTENANCE_DOCUMENT_TYPES,
  MAINTENANCE_PRIORITIES,
  MAINTENANCE_SCHEDULE_TYPES,
  MAINTENANCE_STATUSES,
  MAINTENANCE_TYPES,
} from '../constants/enums';
import type {MaintenanceIntegrationSections} from './integrations';

export type MaintenanceType = (typeof MAINTENANCE_TYPES)[number];
export type MaintenancePriority = (typeof MAINTENANCE_PRIORITIES)[number];
export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number];
export type MaintenanceDocumentType = (typeof MAINTENANCE_DOCUMENT_TYPES)[number];
export type MaintenanceScheduleType = (typeof MAINTENANCE_SCHEDULE_TYPES)[number];
export type MaintenanceAlertType = (typeof MAINTENANCE_ALERT_TYPES)[number];

export interface MaintenanceRecordRow {
  id: string;
  company_id: string;
  branch_id: string | null;
  vehicle_id: string;
  driver_id: string | null;
  trip_id: string | null;
  maintenance_type: MaintenanceType;
  priority: MaintenancePriority;
  maintenance_status: MaintenanceStatus;
  supplier: string | null;
  workshop: string | null;
  opened_at: string;
  completed_at: string | null;
  odometer_km: number | null;
  hour_meter: number | null;
  downtime_hours: number | null;
  description: string | null;
  diagnosis: string | null;
  solution: string | null;
  notes: string | null;
  estimated_amount: number | null;
  final_amount: number | null;
  parts_total: number;
  services_total: number;
  total_cost: number;
  cost_per_km: number | null;
  responsible: string | null;
  payment_type: 'cash' | 'credit';
  payment_due_date: string | null;
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
  drivers?: {id: string; name: string; cpf?: string} | {id: string; name: string; cpf?: string}[] | null;
  trips?: {id: string; trip_number: string; origin?: string | null; destination?: string | null; trip_status?: string} | {id: string; trip_number: string; origin?: string | null; destination?: string | null; trip_status?: string}[] | null;
}

export interface MaintenanceRecord {
  id: string;
  companyId: string;
  branchId: string | null;
  branchName: string | null;
  vehicleId: string;
  vehiclePlate: string | null;
  vehicleModel: string | null;
  driverId: string | null;
  driverName: string | null;
  tripId: string | null;
  tripNumber: string | null;
  maintenanceType: MaintenanceType;
  priority: MaintenancePriority;
  maintenanceStatus: MaintenanceStatus;
  supplier: string | null;
  workshop: string | null;
  openedAt: string;
  completedAt: string | null;
  odometerKm: number | null;
  hourMeter: number | null;
  downtimeHours: number | null;
  description: string | null;
  diagnosis: string | null;
  solution: string | null;
  notes: string | null;
  estimatedAmount: number | null;
  finalAmount: number | null;
  partsTotal: number;
  servicesTotal: number;
  totalCost: number;
  costPerKm: number | null;
  responsible: string | null;
  paymentType: 'cash' | 'credit';
  paymentDueDate: string | null;
  externalId: string | null;
  integrationSource: string | null;
  metadata: Record<string, unknown>;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceHistoryRow {
  id: string;
  company_id: string;
  maintenance_record_id: string;
  action: string;
  changes: Record<string, unknown>;
  created_at: string;
  created_by: string | null;
}

export interface MaintenanceHistory {
  id: string;
  maintenanceRecordId: string;
  action: string;
  changes: Record<string, unknown>;
  createdAt: string;
  createdBy: string | null;
}

export interface MaintenanceDocumentRow {
  id: string;
  company_id: string;
  maintenance_record_id: string;
  name: string;
  file_url: string;
  storage_path: string | null;
  document_type: MaintenanceDocumentType;
  mime_type: string | null;
  file_size: number | null;
  created_at: string;
  deleted_at: string | null;
  created_by: string | null;
}

export interface MaintenanceDocument {
  id: string;
  maintenanceRecordId: string;
  name: string;
  fileUrl: string;
  storagePath: string | null;
  documentType: MaintenanceDocumentType;
  mimeType: string | null;
  fileSize: number | null;
  createdAt: string;
}

export interface MaintenancePartRow {
  id: string;
  company_id: string;
  maintenance_record_id: string;
  name: string;
  code: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  supplier: string | null;
  warranty_until: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface MaintenancePart {
  id: string;
  maintenanceRecordId: string;
  name: string;
  code: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  supplier: string | null;
  warrantyUntil: string | null;
  createdAt: string;
}

export interface MaintenanceServiceRow {
  id: string;
  company_id: string;
  maintenance_record_id: string;
  description: string;
  hours: number | null;
  amount: number;
  responsible: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface MaintenanceService {
  id: string;
  maintenanceRecordId: string;
  description: string;
  hours: number | null;
  amount: number;
  responsible: string | null;
  createdAt: string;
}

export interface MaintenanceScheduleRow {
  id: string;
  company_id: string;
  branch_id: string | null;
  vehicle_id: string;
  driver_id: string | null;
  trip_id: string | null;
  schedule_type: MaintenanceScheduleType;
  alert_type: MaintenanceAlertType;
  alert_km: number | null;
  alert_date: string | null;
  alert_hour_meter: number | null;
  last_done_at: string | null;
  next_due_at: string | null;
  last_odometer_km: number | null;
  last_hour_meter: number | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  deleted_at: string | null;
  vehicles?: {id: string; plate: string; model: string | null} | {id: string; plate: string; model: string | null}[] | null;
}

export interface MaintenanceSchedule {
  id: string;
  companyId: string;
  branchId: string | null;
  vehicleId: string;
  vehiclePlate: string | null;
  driverId: string | null;
  scheduleType: MaintenanceScheduleType;
  alertType: MaintenanceAlertType;
  alertKm: number | null;
  alertDate: string | null;
  alertHourMeter: number | null;
  lastDoneAt: string | null;
  nextDueAt: string | null;
  lastOdometerKm: number | null;
  lastHourMeter: number | null;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
}

export interface PaginatedMaintenanceRecords {
  items: MaintenanceRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface MaintenanceListFilters {
  vehicleId?: string;
  driverId?: string;
  branchId?: string;
  maintenanceType?: MaintenanceType;
  maintenanceStatus?: MaintenanceStatus;
  supplier?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface MaintenanceSortOptions {
  sortBy?: 'opened_at' | 'total_cost' | 'maintenance_status' | 'maintenance_type' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}

export interface MaintenanceVehicleRanking {
  vehicleId: string;
  vehiclePlate: string;
  totalCost: number;
}

export interface MaintenanceSupplierRanking {
  supplier: string;
  maintenanceCount: number;
  totalCost: number;
}

export interface MaintenanceStats {
  total: number;
  preventive: number;
  corrective: number;
  emergency: number;
  totalCost: number;
  averageDowntimeHours: number;
  unavailableVehicles: number;
  overdueSchedules: number;
  topVehicles: MaintenanceVehicleRanking[];
  topSuppliers: MaintenanceSupplierRanking[];
}

export interface MaintenanceDetailData extends MaintenanceIntegrationSections {
  record: MaintenanceRecord;
  history: MaintenanceHistory[];
  documents: MaintenanceDocument[];
  parts: MaintenancePart[];
  services: MaintenanceService[];
  schedules: MaintenanceSchedule[];
  linkedTrip: {
    id: string;
    tripNumber: string;
    origin: string | null;
    destination: string | null;
    tripStatus: string | null;
  } | null;
}

export {
  MAINTENANCE_TYPE_LABELS,
  MAINTENANCE_PRIORITY_LABELS,
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_DOCUMENT_TYPE_LABELS,
  MAINTENANCE_HISTORY_ACTION_LABELS,
  MAINTENANCE_SCHEDULE_TYPE_LABELS,
  MAINTENANCE_ALERT_TYPE_LABELS,
} from '../utils/maintenance-format';
