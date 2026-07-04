import type {
  Trip,
  TripChecklist,
  TripChecklistRow,
  TripDocument,
  TripDocumentRow,
  TripExpense,
  TripExpenseRow,
  TripHistory,
  TripHistoryRow,
  TripLocation,
  TripLocationRow,
  TripOccurrence,
  TripOccurrenceRow,
  TripRow,
  TripStop,
  TripStopRow,
} from '../types';

function mapJoinName<T extends {name?: string}>(
  value: T | T[] | null | undefined,
): string | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0]?.name ?? null;
  return value.name ?? null;
}

function mapJoinField<T, K extends keyof T>(
  value: T | T[] | null | undefined,
  field: K,
): T[K] | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0]?.[field] ?? null;
  return value[field] ?? null;
}

function mapBranchName(row: TripRow): string | null {
  const branch = row.branches;
  if (!branch) return null;
  if (Array.isArray(branch)) return branch[0]?.name ?? null;
  return branch.name ?? null;
}

function computeDistanceKm(
  initial: number | null,
  final: number | null,
): number | null {
  if (initial === null || final === null) return null;
  const diff = final - initial;
  return diff >= 0 ? diff : null;
}

export function mapTripRow(row: TripRow): Trip {
  const initialOdometer =
    row.initial_odometer_km !== null ? Number(row.initial_odometer_km) : null;
  const finalOdometer =
    row.final_odometer_km !== null ? Number(row.final_odometer_km) : null;

  return {
    id: row.id,
    companyId: row.company_id,
    branchId: row.branch_id,
    branchName: mapBranchName(row),
    tripNumber: row.trip_number,
    tripStatus: row.trip_status,
    driverId: row.driver_id,
    driverName: mapJoinName(row.drivers),
    vehicleId: row.vehicle_id,
    vehiclePlate: mapJoinField(row.vehicles, 'plate'),
    vehicleFleetNumber: mapJoinField(row.vehicles, 'fleet_number'),
    clientName: row.client_name,
    contractReference: row.contract_reference,
    customerId: row.customer_id,
    customerContractId: row.customer_contract_id,
    customerName: (() => {
      const c = row.customers;
      if (!c) return row.client_name;
      const customer = Array.isArray(c) ? c[0] : c;
      return customer?.trade_name?.trim() || customer?.legal_name || row.client_name;
    })(),
    freightTable: row.freight_table,
    contractedFreightValue: row.contracted_freight_value !== null ? Number(row.contracted_freight_value) : null,
    actualFreightValue: row.actual_freight_value !== null ? Number(row.actual_freight_value) : null,
    freightMargin: row.freight_margin !== null ? Number(row.freight_margin) : null,
    origin: row.origin,
    destination: row.destination,
    route: row.route,
    initialOdometerKm: initialOdometer,
    finalOdometerKm: finalOdometer,
    initialHourMeter:
      row.initial_hour_meter !== null ? Number(row.initial_hour_meter) : null,
    finalHourMeter:
      row.final_hour_meter !== null ? Number(row.final_hour_meter) : null,
    departedAt: row.departed_at,
    arrivedAt: row.arrived_at,
    weightKg: row.weight_kg !== null ? Number(row.weight_kg) : null,
    volumeM3: row.volume_m3 !== null ? Number(row.volume_m3) : null,
    cargoType: row.cargo_type,
    notes: row.notes,
    responsible: row.responsible,
    metadata: row.metadata ?? {},
    status: row.status,
    externalId: row.external_id ?? null,
    integrationSource: row.integration_source ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    distanceKm: computeDistanceKm(initialOdometer, finalOdometer),
  };
}

export function mapTripHistoryRow(row: TripHistoryRow): TripHistory {
  return {
    id: row.id,
    tripId: row.trip_id,
    action: row.action,
    changes: row.changes ?? {},
    previousTripStatus: row.previous_trip_status,
    newTripStatus: row.new_trip_status,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}

export function mapTripDocumentRow(row: TripDocumentRow): TripDocument {
  return {
    id: row.id,
    tripId: row.trip_id,
    name: row.name,
    fileUrl: row.file_url,
    storagePath: row.storage_path ?? null,
    documentType: row.document_type,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    createdAt: row.created_at,
  };
}

export function mapTripOccurrenceRow(row: TripOccurrenceRow): TripOccurrence {
  return {
    id: row.id,
    tripId: row.trip_id,
    occurrenceType: row.occurrence_type,
    description: row.description,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
  };
}

export function mapTripChecklistRow(row: TripChecklistRow): TripChecklist {
  const photoUrls = Array.isArray(row.photo_urls)
    ? row.photo_urls.filter((url): url is string => typeof url === 'string')
    : [];

  return {
    id: row.id,
    tripId: row.trip_id,
    tiresOk: row.tires_ok,
    headlightsOk: row.headlights_ok,
    brakesOk: row.brakes_ok,
    documentationOk: row.documentation_ok,
    fuelOk: row.fuel_ok,
    odometerReading:
      row.odometer_reading !== null ? Number(row.odometer_reading) : null,
    hourMeterReading:
      row.hour_meter_reading !== null ? Number(row.hour_meter_reading) : null,
    photoUrls,
    signatureUrl: row.signature_url,
    notes: row.notes,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTripExpenseRow(row: TripExpenseRow): TripExpense {
  return {
    id: row.id,
    tripId: row.trip_id,
    expenseType: row.expense_type,
    amount: Number(row.amount),
    currency: row.currency,
    description: row.description,
    expenseDate: row.expense_date,
    receiptUrl: row.receipt_url,
    createdAt: row.created_at,
  };
}

export function mapTripStopRow(row: TripStopRow): TripStop {
  return {
    id: row.id,
    tripId: row.trip_id,
    clientName: row.client_name,
    stopDate: row.stop_date,
    stopTime: row.stop_time,
    latitude: row.latitude !== null ? Number(row.latitude) : null,
    longitude: row.longitude !== null ? Number(row.longitude) : null,
    stoppedMinutes: row.stopped_minutes,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export function mapTripLocationRow(row: TripLocationRow): TripLocation {
  return {
    id: row.id,
    tripId: row.trip_id,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    recordedAt: row.recorded_at,
    speedKmh: row.speed_kmh !== null ? Number(row.speed_kmh) : null,
    accuracyM: row.accuracy_m !== null ? Number(row.accuracy_m) : null,
  };
}
