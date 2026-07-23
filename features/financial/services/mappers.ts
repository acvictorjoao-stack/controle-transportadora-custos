import type {
  FinancialDocument,
  FinancialDocumentRow,
  FinancialEntry,
  FinancialEntryRow,
  FinancialHistory,
  FinancialHistoryRow,
} from '../types';
import {FINANCIAL_ENTRY_STATUS_LABELS} from '../types/financial-entry';

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

export function mapFinancialEntryRow(row: FinancialEntryRow): FinancialEntry {
  const branch = firstRelation(row.branches);
  const vehicle = firstRelation(row.vehicles);
  const driver = firstRelation(row.drivers);
  const trip = firstRelation(row.trips);
  const category = firstRelation(row.financial_categories);
  const costCenter =
    firstRelation(row.cost_centers) ?? firstRelation(row.financial_cost_centers);
  const customer = firstRelation(row.customers);

  return {
    id: row.id,
    companyId: row.company_id,
    branchId: row.branch_id,
    branchName: branch?.name ?? null,
    vehicleId: row.vehicle_id,
    vehiclePlate: vehicle?.plate ?? null,
    driverId: row.driver_id,
    driverName: driver?.name ?? null,
    tripId: row.trip_id,
    tripNumber: trip?.trip_number ?? null,
    fuelRecordId: row.fuel_record_id,
    maintenanceRecordId: row.maintenance_record_id,
    tireId: row.tire_id,
    customerId: row.customer_id ?? null,
    customerContractId: row.customer_contract_id ?? null,
    customerName: customer?.trade_name ?? customer?.legal_name ?? null,
    categoryId: row.category_id,
    categoryName: category?.name ?? null,
    costCenterId: row.cost_center_id,
    costCenterName: costCenter?.name ?? null,
    entryType: row.entry_type,
    entryStatus: row.entry_status,
    description: row.description,
    referenceNumber: row.reference_number,
    supplier: row.supplier ?? null,
    client: row.client ?? null,
    amount: Number(row.amount),
    currency: row.currency,
    entryDate: row.entry_date,
    dueDate: row.due_date,
    paidAt: row.paid_at,
    paidAmount: row.paid_amount != null ? Number(row.paid_amount) : null,
    reversedEntryId: row.reversed_entry_id,
    sourceModule: row.source_module,
    sourceId: row.source_id ?? null,
    isSystemGenerated: row.is_system_generated,
    notes: row.notes,
    externalId: row.external_id ?? null,
    integrationSource: row.integration_source ?? null,
    metadata: row.metadata ?? {},
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapFinancialHistoryRow(row: FinancialHistoryRow): FinancialHistory {
  return {
    id: row.id,
    financialEntryId: row.financial_entry_id,
    action: row.action,
    changes: row.changes ?? {},
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}

export function mapFinancialDocumentRow(row: FinancialDocumentRow): FinancialDocument {
  return {
    id: row.id,
    financialEntryId: row.financial_entry_id,
    name: row.name,
    fileUrl: row.file_url,
    storagePath: row.storage_path,
    documentType: row.document_type,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}

export function toFuelFinancialRecord(entry: FinancialEntry) {
  return {
    id: entry.id,
    date: entry.entryDate,
    category: entry.categoryName ?? '—',
    description: entry.description,
    amount: entry.amount,
    status: FINANCIAL_ENTRY_STATUS_LABELS[entry.entryStatus] ?? entry.entryStatus,
  };
}

export function toVehicleCostRecord(entry: FinancialEntry) {
  return {
    id: entry.id,
    date: entry.entryDate,
    category: entry.categoryName ?? '—',
    description: entry.description,
    amount: entry.amount,
    sourceModule: (entry.sourceModule ?? 'financeiro') as
      | 'financeiro'
      | 'manutencao'
      | 'abastecimento'
      | 'pneus'
      | 'viagem'
      | 'other',
  };
}
