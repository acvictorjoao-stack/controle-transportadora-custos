import type {
  Tire,
  TireDocument,
  TireHistory,
  TireInspection,
  TireMovement,
  TireRecap,
} from '../types';
import type {
  TireDocumentRow,
  TireHistoryRow,
  TireInspectionRow,
  TireMovementRow,
  TireRecapRow,
  TireRow,
} from '../types/tire';

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

export function mapTireRow(row: TireRow): Tire {
  const branch = firstRelation(row.branches);
  const vehicle = firstRelation(row.vehicles);

  return {
    id: row.id,
    companyId: row.company_id,
    branchId: row.branch_id,
    branchName: branch?.name ?? null,
    vehicleId: row.vehicle_id,
    vehiclePlate: vehicle?.plate ?? null,
    vehicleModel: vehicle?.model ?? null,
    maintenanceRecordId: row.maintenance_record_id,
    assetNumber: row.asset_number,
    internalCode: row.internal_code,
    brand: row.brand,
    model: row.model,
    tireSize: row.tire_size,
    manufacturer: row.manufacturer,
    dotNumber: row.dot_number,
    fireNumber: row.fire_number,
    serialNumber: row.serial_number,
    expectedLifeKm: row.expected_life_km !== null ? Number(row.expected_life_km) : null,
    currentKm: Number(row.current_km),
    accumulatedKm: Number(row.accumulated_km),
    purchaseDate: row.purchase_date,
    purchaseValue: row.purchase_value !== null ? Number(row.purchase_value) : null,
    supplier: row.supplier,
    warranty: row.warranty,
    tireStatus: row.tire_status,
    currentPosition: row.current_position,
    notes: row.notes,
    recapCount: Number(row.recap_count),
    totalRecapCost: Number(row.total_recap_cost),
    remainingLifeKm: row.remaining_life_km !== null ? Number(row.remaining_life_km) : null,
    costPerKm: row.cost_per_km !== null ? Number(row.cost_per_km) : null,
    lastTreadDepthMm: row.last_tread_depth_mm !== null ? Number(row.last_tread_depth_mm) : null,
    externalId: row.external_id ?? null,
    integrationSource: row.integration_source ?? null,
    metadata: row.metadata ?? {},
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTireHistoryRow(row: TireHistoryRow): TireHistory {
  return {
    id: row.id,
    tireId: row.tire_id,
    action: row.action,
    changes: row.changes ?? {},
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}

export function mapTireMovementRow(row: TireMovementRow): TireMovement {
  const vehicle = firstRelation(row.vehicles);
  return {
    id: row.id,
    tireId: row.tire_id,
    vehicleId: row.vehicle_id,
    vehiclePlate: vehicle?.plate ?? null,
    movementType: row.movement_type,
    position: row.position,
    installedAt: row.installed_at,
    removedAt: row.removed_at,
    reason: row.reason,
    responsible: row.responsible,
    odometerKm: row.odometer_km !== null ? Number(row.odometer_km) : null,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export function mapTireInspectionRow(row: TireInspectionRow): TireInspection {
  return {
    id: row.id,
    tireId: row.tire_id,
    treadDepthMm: row.tread_depth_mm !== null ? Number(row.tread_depth_mm) : null,
    pressurePsi: row.pressure_psi !== null ? Number(row.pressure_psi) : null,
    wearLevel: row.wear_level,
    inspectedAt: row.inspected_at,
    responsible: row.responsible,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export function mapTireRecapRow(row: TireRecapRow): TireRecap {
  return {
    id: row.id,
    tireId: row.tire_id,
    supplier: row.supplier,
    recapNumber: row.recap_number,
    amount: row.amount !== null ? Number(row.amount) : null,
    odometerKm: row.odometer_km !== null ? Number(row.odometer_km) : null,
    recappedAt: row.recapped_at,
    warranty: row.warranty,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export function mapTireDocumentRow(row: TireDocumentRow): TireDocument {
  return {
    id: row.id,
    tireId: row.tire_id,
    name: row.name,
    fileUrl: row.file_url,
    storagePath: row.storage_path,
    documentType: row.document_type,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    createdAt: row.created_at,
  };
}
