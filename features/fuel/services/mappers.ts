import type {
  FuelDocument,
  FuelDocumentRow,
  FuelHistory,
  FuelHistoryRow,
  FuelRecord,
  FuelRecordRow,
} from '../types';

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function mapBranchName(row: FuelRecordRow): string | null {
  const branch = firstRelation(row.branches);
  return branch?.name ?? null;
}

export function mapFuelRecordRow(row: FuelRecordRow): FuelRecord {
  const vehicle = firstRelation(row.vehicles);
  const driver = firstRelation(row.drivers);
  const trip = firstRelation(row.trips);

  return {
    id: row.id,
    companyId: row.company_id,
    branchId: row.branch_id,
    branchName: mapBranchName(row),
    vehicleId: row.vehicle_id,
    vehiclePlate: vehicle?.plate ?? null,
    vehicleModel: vehicle?.model ?? null,
    driverId: row.driver_id,
    driverName: driver?.name ?? null,
    tripId: row.trip_id,
    tripNumber: trip?.trip_number ?? null,
    supplierId: row.supplier_id ?? null,
    stationName: row.station_name,
    stationBrand: row.station_brand,
    city: row.city,
    state: row.state,
    fueledAt: row.fueled_at,
    fuelType: row.fuel_type,
    quantityLiters: Number(row.quantity_liters),
    pricePerLiter: Number(row.price_per_liter),
    totalAmount: Number(row.total_amount),
    odometerKm: row.odometer_km !== null ? Number(row.odometer_km) : null,
    hourMeter: row.hour_meter !== null ? Number(row.hour_meter) : null,
    kmTraveled: row.km_traveled !== null ? Number(row.km_traveled) : null,
    consumptionLPer100km:
      row.consumption_l_per_100km !== null ? Number(row.consumption_l_per_100km) : null,
    kmPerLiter: row.km_per_liter !== null ? Number(row.km_per_liter) : null,
    costPerKm: row.cost_per_km !== null ? Number(row.cost_per_km) : null,
    autonomyKm: row.autonomy_km !== null ? Number(row.autonomy_km) : null,
    notes: row.notes,
    responsible: row.responsible,
    isInconsistent: row.is_inconsistent,
    inconsistencyFlags: row.inconsistency_flags ?? [],
    paymentType: row.payment_type === 'credit' ? 'credit' : 'cash',
    paymentDueDate: row.payment_due_date ?? null,
    installmentCount: Number(row.installment_count ?? 1),
    installmentIntervalDays: Number(row.installment_interval_days ?? 30),
    externalId: row.external_id ?? null,
    integrationSource: row.integration_source ?? null,
    metadata: row.metadata ?? {},
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapFuelHistoryRow(row: FuelHistoryRow): FuelHistory {
  return {
    id: row.id,
    fuelRecordId: row.fuel_record_id,
    action: row.action,
    changes: row.changes ?? {},
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}

export function mapFuelDocumentRow(row: FuelDocumentRow): FuelDocument {
  return {
    id: row.id,
    fuelRecordId: row.fuel_record_id,
    name: row.name,
    fileUrl: row.file_url,
    storagePath: row.storage_path ?? null,
    documentType: row.document_type,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    createdAt: row.created_at,
  };
}

export function getVehicleTankCapacity(row: FuelRecordRow): number | null {
  const vehicle = firstRelation(row.vehicles);
  if (!vehicle?.tank_capacity_liters) return null;
  return Number(vehicle.tank_capacity_liters);
}
