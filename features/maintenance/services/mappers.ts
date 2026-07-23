import type {
  MaintenanceDocument,
  MaintenanceDocumentRow,
  MaintenanceHistory,
  MaintenanceHistoryRow,
  MaintenancePart,
  MaintenancePartRow,
  MaintenanceRecord,
  MaintenanceRecordRow,
  MaintenanceSchedule,
  MaintenanceScheduleRow,
  MaintenanceService,
  MaintenanceServiceRow,
} from '../types';

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function mapBranchName(row: MaintenanceRecordRow): string | null {
  const branch = firstRelation(row.branches);
  return branch?.name ?? null;
}

export function mapMaintenanceRecordRow(row: MaintenanceRecordRow): MaintenanceRecord {
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
    maintenanceType: row.maintenance_type,
    priority: row.priority,
    maintenanceStatus: row.maintenance_status,
    supplierId: row.supplier_id ?? null,
    supplier: row.supplier,
    workshop: row.workshop,
    openedAt: row.opened_at,
    completedAt: row.completed_at,
    odometerKm: row.odometer_km !== null ? Number(row.odometer_km) : null,
    hourMeter: row.hour_meter !== null ? Number(row.hour_meter) : null,
    downtimeHours: row.downtime_hours !== null ? Number(row.downtime_hours) : null,
    description: row.description,
    diagnosis: row.diagnosis,
    solution: row.solution,
    notes: row.notes,
    estimatedAmount: row.estimated_amount !== null ? Number(row.estimated_amount) : null,
    finalAmount: row.final_amount !== null ? Number(row.final_amount) : null,
    partsTotal: Number(row.parts_total),
    servicesTotal: Number(row.services_total),
    totalCost: Number(row.total_cost),
    costPerKm: row.cost_per_km !== null ? Number(row.cost_per_km) : null,
    responsible: row.responsible,
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

export function mapMaintenanceHistoryRow(row: MaintenanceHistoryRow): MaintenanceHistory {
  return {
    id: row.id,
    maintenanceRecordId: row.maintenance_record_id,
    action: row.action,
    changes: row.changes ?? {},
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}

export function mapMaintenanceDocumentRow(row: MaintenanceDocumentRow): MaintenanceDocument {
  return {
    id: row.id,
    maintenanceRecordId: row.maintenance_record_id,
    name: row.name,
    fileUrl: row.file_url,
    storagePath: row.storage_path ?? null,
    documentType: row.document_type,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    createdAt: row.created_at,
  };
}

export function mapMaintenancePartRow(row: MaintenancePartRow): MaintenancePart {
  return {
    id: row.id,
    maintenanceRecordId: row.maintenance_record_id,
    name: row.name,
    code: row.code,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    totalPrice: Number(row.total_price),
    supplier: row.supplier,
    warrantyUntil: row.warranty_until,
    createdAt: row.created_at,
  };
}

export function mapMaintenanceServiceRow(row: MaintenanceServiceRow): MaintenanceService {
  return {
    id: row.id,
    maintenanceRecordId: row.maintenance_record_id,
    description: row.description,
    hours: row.hours !== null ? Number(row.hours) : null,
    amount: Number(row.amount),
    responsible: row.responsible,
    createdAt: row.created_at,
  };
}

export function mapMaintenanceScheduleRow(row: MaintenanceScheduleRow): MaintenanceSchedule {
  const vehicle = firstRelation(row.vehicles);
  return {
    id: row.id,
    companyId: row.company_id,
    branchId: row.branch_id,
    vehicleId: row.vehicle_id,
    vehiclePlate: vehicle?.plate ?? null,
    driverId: row.driver_id,
    scheduleType: row.schedule_type,
    alertType: row.alert_type,
    alertKm: row.alert_km !== null ? Number(row.alert_km) : null,
    alertDate: row.alert_date,
    alertHourMeter: row.alert_hour_meter !== null ? Number(row.alert_hour_meter) : null,
    lastDoneAt: row.last_done_at,
    nextDueAt: row.next_due_at,
    lastOdometerKm: row.last_odometer_km !== null ? Number(row.last_odometer_km) : null,
    lastHourMeter: row.last_hour_meter !== null ? Number(row.last_hour_meter) : null,
    isActive: row.is_active,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export function getLinkedTripFromRow(row: MaintenanceRecordRow) {
  const trip = firstRelation(row.trips);
  if (!trip) return null;
  return {
    id: trip.id,
    tripNumber: trip.trip_number,
    origin: trip.origin ?? null,
    destination: trip.destination ?? null,
    tripStatus: trip.trip_status ?? null,
  };
}
