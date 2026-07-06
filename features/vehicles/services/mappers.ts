import type {
  Vehicle,
  VehicleBodyType,
  VehicleDocument,
  VehicleDocumentRow,
  VehicleHistory,
  VehicleHistoryRow,
  VehicleRow,
} from '../types';

function mapBranchName(row: VehicleRow): string | null {
  const branch = row.branches;
  if (!branch) return null;
  if (Array.isArray(branch)) {
    return branch[0]?.name ?? null;
  }
  return branch.name ?? null;
}

export function mapVehicleRow(row: VehicleRow): Vehicle {
  return {
    id: row.id,
    companyId: row.company_id,
    branchId: row.branch_id,
    branchName: mapBranchName(row),
    plate: row.plate,
    fleetNumber: row.fleet_number,
    vehicleType: row.vehicle_type,
    bodyType: (row.body_type as VehicleBodyType | null) ?? null,
    brand: row.brand,
    model: row.model,
    year: row.year,
    renavam: row.renavam,
    chassis: row.chassis,
    color: row.color,
    fuelType: row.fuel_type,
    loadCapacityKg: row.load_capacity_kg,
    grossWeightKg: row.gross_weight_kg,
    tareKg: row.tare_kg,
    axles: row.axles,
    initialOdometerKm: Number(row.initial_odometer_km),
    currentOdometerKm: Number(row.current_odometer_km),
    hourMeter: row.hour_meter !== null ? Number(row.hour_meter) : null,
    assetStatus: row.asset_status,
    photoUrl: row.photo_url,
    crlvUrl: row.crlv_url,
    photoStoragePath: row.photo_storage_path ?? null,
    crlvStoragePath: row.crlv_storage_path ?? null,
    externalId: row.external_id ?? null,
    integrationSource: row.integration_source ?? null,
    metadata: row.metadata ?? {},
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapVehicleHistoryRow(row: VehicleHistoryRow): VehicleHistory {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    action: row.action,
    changes: row.changes ?? {},
    previousAssetStatus: row.previous_asset_status,
    newAssetStatus: row.new_asset_status,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}

export function mapVehicleDocumentRow(row: VehicleDocumentRow): VehicleDocument {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    name: row.name,
    fileUrl: row.file_url,
    storagePath: row.storage_path ?? null,
    documentType: row.document_type,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    createdAt: row.created_at,
  };
}
