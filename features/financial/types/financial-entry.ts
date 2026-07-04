import type {EntityStatus} from '@/features/organization/companies/types';

import type {
  FINANCIAL_COST_CENTER_TYPES,
  FINANCIAL_DOCUMENT_TYPES,
  FINANCIAL_ENTRY_STATUSES,
  FINANCIAL_ENTRY_TYPES,
} from '../constants/enums';

export type FinancialEntryType = (typeof FINANCIAL_ENTRY_TYPES)[number];
export type FinancialEntryStatus = (typeof FINANCIAL_ENTRY_STATUSES)[number];
export type FinancialCostCenterType = (typeof FINANCIAL_COST_CENTER_TYPES)[number];
export type FinancialDocumentType = (typeof FINANCIAL_DOCUMENT_TYPES)[number];

export interface FinancialEntryRow {
  id: string;
  company_id: string;
  branch_id: string | null;
  vehicle_id: string | null;
  driver_id: string | null;
  trip_id: string | null;
  fuel_record_id: string | null;
  maintenance_record_id: string | null;
  tire_id: string | null;
  customer_id: string | null;
  customer_contract_id: string | null;
  category_id: string | null;
  cost_center_id: string | null;
  entry_type: FinancialEntryType;
  entry_status: FinancialEntryStatus;
  description: string | null;
  reference_number: string | null;
  amount: number;
  currency: string;
  entry_date: string;
  due_date: string | null;
  paid_at: string | null;
  reversed_entry_id: string | null;
  source_module: string | null;
  is_system_generated: boolean;
  notes: string | null;
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
  financial_categories?: {id: string; name: string; slug: string | null} | {id: string; name: string; slug: string | null}[] | null;
  financial_cost_centers?: {id: string; name: string; center_type: FinancialCostCenterType} | {id: string; name: string; center_type: FinancialCostCenterType}[] | null;
  customers?: {id: string; legal_name: string; trade_name: string | null} | {id: string; legal_name: string; trade_name: string | null}[] | null;
}

export interface FinancialEntry {
  id: string;
  companyId: string;
  branchId: string | null;
  branchName: string | null;
  vehicleId: string | null;
  vehiclePlate: string | null;
  driverId: string | null;
  driverName: string | null;
  tripId: string | null;
  tripNumber: string | null;
  fuelRecordId: string | null;
  maintenanceRecordId: string | null;
  tireId: string | null;
  customerId: string | null;
  customerContractId: string | null;
  customerName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  costCenterId: string | null;
  costCenterName: string | null;
  entryType: FinancialEntryType;
  entryStatus: FinancialEntryStatus;
  description: string | null;
  referenceNumber: string | null;
  amount: number;
  currency: string;
  entryDate: string;
  dueDate: string | null;
  paidAt: string | null;
  reversedEntryId: string | null;
  sourceModule: string | null;
  isSystemGenerated: boolean;
  notes: string | null;
  externalId: string | null;
  integrationSource: string | null;
  metadata: Record<string, unknown>;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialHistoryRow {
  id: string;
  company_id: string;
  financial_entry_id: string;
  action: string;
  changes: Record<string, unknown>;
  created_at: string;
  created_by: string | null;
}

export interface FinancialHistory {
  id: string;
  financialEntryId: string;
  action: string;
  changes: Record<string, unknown>;
  createdAt: string;
  createdBy: string | null;
}

export interface FinancialDocumentRow {
  id: string;
  company_id: string;
  financial_entry_id: string;
  name: string;
  file_url: string;
  storage_path: string | null;
  document_type: FinancialDocumentType;
  mime_type: string | null;
  file_size: number | null;
  created_at: string;
  created_by: string | null;
}

export interface FinancialDocument {
  id: string;
  financialEntryId: string;
  name: string;
  fileUrl: string;
  storagePath: string | null;
  documentType: FinancialDocumentType;
  mimeType: string | null;
  fileSize: number | null;
  createdAt: string;
  createdBy: string | null;
}

export interface FinancialCategory {
  id: string;
  companyId: string;
  name: string;
  slug: string | null;
  isSystem: boolean;
}

export interface FinancialCostCenter {
  id: string;
  companyId: string;
  name: string;
  centerType: FinancialCostCenterType;
  isSystem: boolean;
}

export interface FinancialListFilters {
  branchId?: string;
  vehicleId?: string;
  driverId?: string;
  tripId?: string;
  categoryId?: string;
  costCenterId?: string;
  entryType?: FinancialEntryType;
  entryStatus?: FinancialEntryStatus;
  dateFrom?: string;
  dateTo?: string;
}

export interface FinancialSortOptions {
  sortBy?: 'entry_date' | 'amount' | 'entry_type' | 'entry_status' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedFinancialEntries {
  items: FinancialEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface FinancialDetailData {
  entry: FinancialEntry;
  history: FinancialHistory[];
  documents: FinancialDocument[];
  relatedEntries: FinancialEntry[];
}

export interface FinancialStatsRanking {
  id: string;
  name: string;
  amount: number;
}

export interface FinancialStats {
  total: number;
  revenue: number;
  expenses: number;
  balance: number;
  cashFlow: number;
  operatingProfit: number;
  marginPercent: number;
  ebitda: number;
  fuelCost: number;
  maintenanceCost: number;
  tireCost: number;
  costPerKm: number;
  costPerVehicle: number;
  costPerDriver: number;
  costPerTrip: number;
  topVehicles: {vehicleId: string; vehiclePlate: string; totalCost: number}[];
  topDrivers: {driverId: string; driverName: string; totalCost: number}[];
  topCategories: {categoryId: string; categoryName: string; totalAmount: number}[];
  topCostCenters: {costCenterId: string; costCenterName: string; totalAmount: number}[];
  topTrips: {tripId: string; tripNumber: string; totalRevenue: number; totalExpense: number; profit: number}[];
}

export const FINANCIAL_ENTRY_TYPE_LABELS: Record<FinancialEntryType, string> = {
  revenue: 'Receita',
  expense: 'Despesa',
  transfer: 'Transferência',
  reimbursement: 'Reembolso',
  advance: 'Adiantamento',
  reversal: 'Estorno',
  adjustment: 'Ajuste',
};

export const FINANCIAL_ENTRY_STATUS_LABELS: Record<FinancialEntryStatus, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  cancelled: 'Cancelado',
  reversed: 'Estornado',
  overdue: 'Vencido',
};

export const FINANCIAL_DOCUMENT_TYPE_LABELS: Record<FinancialDocumentType, string> = {
  invoice: 'Nota Fiscal',
  boleto: 'Boleto',
  receipt: 'Recibo',
  proof: 'Comprovante',
  other: 'Outros',
};

export const FINANCIAL_HISTORY_ACTION_LABELS: Record<string, string> = {
  create: 'Criação',
  update: 'Edição',
  payment: 'Pagamento',
  cancellation: 'Cancelamento',
  reversal: 'Estorno',
  soft_delete: 'Exclusão',
  correction: 'Correção',
  status_change: 'Alteração de status',
  document_upload: 'Upload de documento',
};
