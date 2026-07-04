import type {SupabaseClient} from '@supabase/supabase-js';

import {mapDatabaseError} from '@/features/master/companies/utils/database-error';

import {
  MAINTENANCE_DETAIL_COLUMNS,
  MAINTENANCE_LIST_COLUMNS,
  MAINTENANCE_PAGE_SIZE,
  MAINTENANCE_STORAGE_BUCKET,
} from '../constants';
import {
  getLinkedTripFromRow,
  mapMaintenanceDocumentRow,
  mapMaintenanceHistoryRow,
  mapMaintenancePartRow,
  mapMaintenanceRecordRow,
  mapMaintenanceScheduleRow,
  mapMaintenanceServiceRow,
} from '../services/mappers';
import type {
  MaintenanceDocument,
  MaintenanceHistory,
  MaintenanceListFilters,
  MaintenancePart,
  MaintenanceRecord,
  MaintenanceRecordRow,
  MaintenanceSchedule,
  MaintenanceService,
  MaintenanceSortOptions,
  MaintenanceStats,
  MaintenanceSupplierRanking,
  MaintenanceVehicleRanking,
  PaginatedMaintenanceRecords,
} from '../types';
import {calculateMaintenanceMetrics, calculatePartTotal} from '../utils/maintenance-calculations';
import type {
  CreateMaintenancePartInput,
  CreateMaintenanceRecordInput,
  CreateMaintenanceServiceInput,
  UpdateMaintenancePartInput,
  UpdateMaintenanceRecordInput,
  UpdateMaintenanceServiceInput,
} from '../validation';

export interface ListMaintenanceRecordsOptions {
  companyId: string;
  search?: string;
  page?: number;
  pageSize?: number;
  filters?: MaintenanceListFilters;
  sort?: MaintenanceSortOptions;
}

const SORT_COLUMNS: Record<NonNullable<MaintenanceSortOptions['sortBy']>, string> = {
  opened_at: 'opened_at',
  total_cost: 'total_cost',
  maintenance_status: 'maintenance_status',
  maintenance_type: 'maintenance_type',
  created_at: 'created_at',
};

function sanitizeSearchTerm(value: string): string {
  return value.replace(/[%(),]/g, '').trim();
}

function buildMaintenancePayload(
  input: CreateMaintenanceRecordInput | UpdateMaintenanceRecordInput,
  profileId: string,
  metrics: ReturnType<typeof calculateMaintenanceMetrics>,
  isCreate: boolean,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    vehicle_id: input.vehicleId,
    driver_id: input.driverId,
    trip_id: input.tripId,
    branch_id: input.branchId,
    maintenance_type: input.maintenanceType,
    priority: input.priority,
    maintenance_status: input.maintenanceStatus,
    supplier: input.supplier,
    workshop: input.workshop,
    opened_at: input.openedAt,
    completed_at: input.completedAt,
    odometer_km: input.odometerKm,
    hour_meter: input.hourMeter,
    downtime_hours: metrics.downtimeHours,
    description: input.description,
    diagnosis: input.diagnosis,
    solution: input.solution,
    notes: input.notes,
    estimated_amount: input.estimatedAmount,
    final_amount: input.finalAmount ?? metrics.totalCost,
    cost_per_km: metrics.costPerKm,
    responsible: input.responsible,
    updated_by: profileId,
  };

  if (isCreate) {
    payload.created_by = profileId;
  }

  return payload;
}

export async function listMaintenanceRecords(
  supabase: SupabaseClient,
  options: ListMaintenanceRecordsOptions,
): Promise<PaginatedMaintenanceRecords> {
  const search = sanitizeSearchTerm(options.search ?? '');
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? MAINTENANCE_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const filters = options.filters ?? {};
  const sortBy = options.sort?.sortBy ?? 'opened_at';
  const sortOrder = options.sort?.sortOrder ?? 'desc';
  const ascending = sortOrder === 'asc';
  const sortColumn = SORT_COLUMNS[sortBy] ?? 'opened_at';

  let query = supabase
    .from('maintenance_records')
    .select(MAINTENANCE_LIST_COLUMNS, {count: 'exact'})
    .eq('company_id', options.companyId)
    .is('deleted_at', null);

  if (filters.vehicleId) query = query.eq('vehicle_id', filters.vehicleId);
  if (filters.driverId) query = query.eq('driver_id', filters.driverId);
  if (filters.branchId) query = query.eq('branch_id', filters.branchId);
  if (filters.maintenanceType) query = query.eq('maintenance_type', filters.maintenanceType);
  if (filters.maintenanceStatus) query = query.eq('maintenance_status', filters.maintenanceStatus);
  if (filters.supplier) query = query.ilike('supplier', `%${filters.supplier}%`);
  if (filters.dateFrom) query = query.gte('opened_at', filters.dateFrom);
  if (filters.dateTo) query = query.lte('opened_at', `${filters.dateTo}T23:59:59.999Z`);

  if (search) {
    query = query.or(
      `supplier.ilike.%${search}%,workshop.ilike.%${search}%,description.ilike.%${search}%,responsible.ilike.%${search}%`,
    );
  }

  const {data, error, count} = await query
    .order(sortColumn, {ascending, nullsFirst: false})
    .range(from, to);

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  const total = count ?? 0;

  return {
    items: (data ?? []).map((row) =>
      mapMaintenanceRecordRow(row as unknown as MaintenanceRecordRow),
    ),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getMaintenanceRecordById(
  supabase: SupabaseClient,
  companyId: string,
  maintenanceRecordId: string,
): Promise<MaintenanceRecord | null> {
  const {data, error} = await supabase
    .from('maintenance_records')
    .select(MAINTENANCE_DETAIL_COLUMNS)
    .eq('id', maintenanceRecordId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  if (!data) return null;
  return mapMaintenanceRecordRow(data as unknown as MaintenanceRecordRow);
}

async function syncMaintenanceFinancialEntry(
  supabase: SupabaseClient,
  companyId: string,
  maintenanceRecordId: string,
  profileId: string,
): Promise<void> {
  const record = await getMaintenanceRecordById(supabase, companyId, maintenanceRecordId);
  if (!record) return;

  try {
    const {onMaintenanceRecordCreated} = await import(
      '@/features/financial/services/integration-events'
    );
    await onMaintenanceRecordCreated(supabase, companyId, record, profileId);
  } catch {
    // Financial integration must not block maintenance operations
  }
}

export async function createMaintenanceRecord(
  supabase: SupabaseClient,
  companyId: string,
  input: CreateMaintenanceRecordInput,
  profileId: string,
): Promise<MaintenanceRecord> {
  const metrics = calculateMaintenanceMetrics({
    openedAt: input.openedAt,
    completedAt: input.completedAt,
    maintenanceStatus: input.maintenanceStatus,
    odometerKm: input.odometerKm,
    finalAmount: input.finalAmount,
  });
  const payload = buildMaintenancePayload(input, profileId, metrics, true);

  const {data, error} = await supabase
    .from('maintenance_records')
    .insert({...payload, company_id: companyId})
    .select(MAINTENANCE_DETAIL_COLUMNS)
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  const record = mapMaintenanceRecordRow(data as unknown as MaintenanceRecordRow);

  await syncMaintenanceFinancialEntry(supabase, companyId, record.id, profileId);

  return record;
}

export async function updateMaintenanceRecord(
  supabase: SupabaseClient,
  companyId: string,
  maintenanceRecordId: string,
  input: UpdateMaintenanceRecordInput,
  profileId: string,
): Promise<MaintenanceRecord> {
  const metrics = calculateMaintenanceMetrics({
    openedAt: input.openedAt,
    completedAt: input.completedAt,
    maintenanceStatus: input.maintenanceStatus,
    odometerKm: input.odometerKm,
    finalAmount: input.finalAmount,
  });
  const payload = buildMaintenancePayload(input, profileId, metrics, false);

  const {data, error} = await supabase
    .from('maintenance_records')
    .update(payload)
    .eq('id', maintenanceRecordId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .select(MAINTENANCE_DETAIL_COLUMNS)
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  const record = mapMaintenanceRecordRow(data as unknown as MaintenanceRecordRow);

  await syncMaintenanceFinancialEntry(supabase, companyId, record.id, profileId);

  return record;
}

export async function softDeleteMaintenanceRecord(
  supabase: SupabaseClient,
  companyId: string,
  maintenanceRecordId: string,
  profileId: string,
): Promise<void> {
  try {
    const {onLinkedFinancialEntryDeleted} = await import(
      '@/features/financial/services/integration-events'
    );
    await onLinkedFinancialEntryDeleted(supabase, companyId, profileId, {maintenanceRecordId});
  } catch {
    // Financial integration must not block maintenance operations
  }

  const {error} = await supabase
    .from('maintenance_records')
    .update({
      deleted_at: new Date().toISOString(),
      status: 'archived',
      updated_by: profileId,
    })
    .eq('id', maintenanceRecordId)
    .eq('company_id', companyId);

  if (error) {
    throw new Error(mapDatabaseError(error));
  }
}

export async function getMaintenanceStats(
  supabase: SupabaseClient,
  companyId: string,
): Promise<MaintenanceStats> {
  const {data, error} = await supabase.rpc('get_maintenance_stats', {
    p_company_id: companyId,
  });

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  const stats = (data ?? {}) as Record<string, unknown>;

  const topVehiclesRaw = Array.isArray(stats.top_vehicles) ? stats.top_vehicles : [];
  const topSuppliersRaw = Array.isArray(stats.top_suppliers) ? stats.top_suppliers : [];

  const topVehicles: MaintenanceVehicleRanking[] = topVehiclesRaw.map((item) => {
    const row = item as Record<string, unknown>;
    return {
      vehicleId: String(row.vehicle_id ?? ''),
      vehiclePlate: String(row.vehicle_plate ?? ''),
      totalCost: Number(row.total_cost ?? 0),
    };
  });

  const topSuppliers: MaintenanceSupplierRanking[] = topSuppliersRaw.map((item) => {
    const row = item as Record<string, unknown>;
    return {
      supplier: String(row.supplier ?? ''),
      maintenanceCount: Number(row.maintenance_count ?? 0),
      totalCost: Number(row.total_cost ?? 0),
    };
  });

  return {
    total: Number(stats.total ?? 0),
    preventive: Number(stats.preventive ?? 0),
    corrective: Number(stats.corrective ?? 0),
    emergency: Number(stats.emergency ?? 0),
    totalCost: Number(stats.total_cost ?? 0),
    averageDowntimeHours: Number(stats.average_downtime_hours ?? 0),
    unavailableVehicles: Number(stats.unavailable_vehicles ?? 0),
    overdueSchedules: Number(stats.overdue_schedules ?? 0),
    topVehicles,
    topSuppliers,
  };
}

export async function listMaintenanceHistory(
  supabase: SupabaseClient,
  companyId: string,
  maintenanceRecordId: string,
): Promise<MaintenanceHistory[]> {
  const {data, error} = await supabase
    .from('maintenance_history')
    .select('*')
    .eq('company_id', companyId)
    .eq('maintenance_record_id', maintenanceRecordId)
    .order('created_at', {ascending: false});

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return (data ?? []).map((row) =>
    mapMaintenanceHistoryRow(row as Parameters<typeof mapMaintenanceHistoryRow>[0]),
  );
}

export async function listMaintenanceDocuments(
  supabase: SupabaseClient,
  companyId: string,
  maintenanceRecordId: string,
): Promise<MaintenanceDocument[]> {
  const {data, error} = await supabase
    .from('maintenance_documents')
    .select('*')
    .eq('company_id', companyId)
    .eq('maintenance_record_id', maintenanceRecordId)
    .is('deleted_at', null)
    .order('created_at', {ascending: false});

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return (data ?? []).map((row) =>
    mapMaintenanceDocumentRow(row as Parameters<typeof mapMaintenanceDocumentRow>[0]),
  );
}

export async function createMaintenanceDocument(
  supabase: SupabaseClient,
  companyId: string,
  maintenanceRecordId: string,
  input: {
    name: string;
    fileUrl: string;
    storagePath: string;
    documentType: string;
    mimeType?: string | null;
    fileSize?: number | null;
    branchId?: string | null;
    vehicleId?: string | null;
    driverId?: string | null;
    tripId?: string | null;
  },
  profileId: string,
): Promise<MaintenanceDocument> {
  const {data, error} = await supabase
    .from('maintenance_documents')
    .insert({
      company_id: companyId,
      maintenance_record_id: maintenanceRecordId,
      branch_id: input.branchId ?? null,
      vehicle_id: input.vehicleId ?? null,
      driver_id: input.driverId ?? null,
      trip_id: input.tripId ?? null,
      name: input.name,
      file_url: input.fileUrl,
      storage_path: input.storagePath,
      document_type: input.documentType,
      mime_type: input.mimeType ?? null,
      file_size: input.fileSize ?? null,
      created_by: profileId,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapMaintenanceDocumentRow(data as Parameters<typeof mapMaintenanceDocumentRow>[0]);
}

export async function softDeleteMaintenanceDocument(
  supabase: SupabaseClient,
  companyId: string,
  documentId: string,
): Promise<void> {
  const {data: document, error: fetchError} = await supabase
    .from('maintenance_documents')
    .select('storage_path')
    .eq('id', documentId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .maybeSingle();

  if (fetchError) {
    throw new Error(mapDatabaseError(fetchError));
  }

  const {error} = await supabase
    .from('maintenance_documents')
    .update({deleted_at: new Date().toISOString()})
    .eq('id', documentId)
    .eq('company_id', companyId);

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  const storagePath = document?.storage_path;
  if (storagePath) {
    await supabase.storage.from(MAINTENANCE_STORAGE_BUCKET).remove([storagePath]);
  }
}

export async function listMaintenanceParts(
  supabase: SupabaseClient,
  companyId: string,
  maintenanceRecordId: string,
): Promise<MaintenancePart[]> {
  const {data, error} = await supabase
    .from('maintenance_parts')
    .select('*')
    .eq('company_id', companyId)
    .eq('maintenance_record_id', maintenanceRecordId)
    .is('deleted_at', null)
    .order('created_at', {ascending: false});

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return (data ?? []).map((row) =>
    mapMaintenancePartRow(row as Parameters<typeof mapMaintenancePartRow>[0]),
  );
}

export async function createMaintenancePart(
  supabase: SupabaseClient,
  companyId: string,
  input: CreateMaintenancePartInput,
  profileId: string,
  context: {branchId?: string | null; vehicleId?: string | null; driverId?: string | null; tripId?: string | null},
): Promise<MaintenancePart> {
  const totalPrice = calculatePartTotal(input.quantity, input.unitPrice ?? 0);

  const {data, error} = await supabase
    .from('maintenance_parts')
    .insert({
      company_id: companyId,
      maintenance_record_id: input.maintenanceRecordId,
      branch_id: context.branchId ?? null,
      vehicle_id: context.vehicleId ?? null,
      driver_id: context.driverId ?? null,
      trip_id: context.tripId ?? null,
      name: input.name,
      code: input.code,
      quantity: input.quantity,
      unit_price: input.unitPrice,
      total_price: totalPrice,
      supplier: input.supplier,
      warranty_until: input.warrantyUntil,
      created_by: profileId,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  await syncMaintenanceFinancialEntry(supabase, companyId, input.maintenanceRecordId, profileId);

  return mapMaintenancePartRow(data as Parameters<typeof mapMaintenancePartRow>[0]);
}

export async function updateMaintenancePart(
  supabase: SupabaseClient,
  companyId: string,
  partId: string,
  input: UpdateMaintenancePartInput,
  profileId: string,
): Promise<MaintenancePart> {
  const totalPrice = calculatePartTotal(input.quantity, input.unitPrice ?? 0);

  const {data, error} = await supabase
    .from('maintenance_parts')
    .update({
      name: input.name,
      code: input.code,
      quantity: input.quantity,
      unit_price: input.unitPrice,
      total_price: totalPrice,
      supplier: input.supplier,
      warranty_until: input.warrantyUntil,
      updated_by: profileId,
    })
    .eq('id', partId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .select('*')
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  const part = mapMaintenancePartRow(data as Parameters<typeof mapMaintenancePartRow>[0]);
  await syncMaintenanceFinancialEntry(supabase, companyId, part.maintenanceRecordId, profileId);

  return part;
}

export async function softDeleteMaintenancePart(
  supabase: SupabaseClient,
  companyId: string,
  partId: string,
  profileId: string,
): Promise<void> {
  const {data: partRow} = await supabase
    .from('maintenance_parts')
    .select('maintenance_record_id')
    .eq('id', partId)
    .eq('company_id', companyId)
    .maybeSingle();

  const {error} = await supabase
    .from('maintenance_parts')
    .update({deleted_at: new Date().toISOString(), updated_by: profileId})
    .eq('id', partId)
    .eq('company_id', companyId);

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  if (partRow?.maintenance_record_id) {
    await syncMaintenanceFinancialEntry(
      supabase,
      companyId,
      String(partRow.maintenance_record_id),
      profileId,
    );
  }
}

export async function listMaintenanceServices(
  supabase: SupabaseClient,
  companyId: string,
  maintenanceRecordId: string,
): Promise<MaintenanceService[]> {
  const {data, error} = await supabase
    .from('maintenance_services')
    .select('*')
    .eq('company_id', companyId)
    .eq('maintenance_record_id', maintenanceRecordId)
    .is('deleted_at', null)
    .order('created_at', {ascending: false});

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return (data ?? []).map((row) =>
    mapMaintenanceServiceRow(row as Parameters<typeof mapMaintenanceServiceRow>[0]),
  );
}

export async function createMaintenanceService(
  supabase: SupabaseClient,
  companyId: string,
  input: CreateMaintenanceServiceInput,
  profileId: string,
  context: {branchId?: string | null; vehicleId?: string | null; driverId?: string | null; tripId?: string | null},
): Promise<MaintenanceService> {
  const {data, error} = await supabase
    .from('maintenance_services')
    .insert({
      company_id: companyId,
      maintenance_record_id: input.maintenanceRecordId,
      branch_id: context.branchId ?? null,
      vehicle_id: context.vehicleId ?? null,
      driver_id: context.driverId ?? null,
      trip_id: context.tripId ?? null,
      description: input.description,
      hours: input.hours,
      amount: input.amount,
      responsible: input.responsible,
      created_by: profileId,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  await syncMaintenanceFinancialEntry(supabase, companyId, input.maintenanceRecordId, profileId);

  return mapMaintenanceServiceRow(data as Parameters<typeof mapMaintenanceServiceRow>[0]);
}

export async function updateMaintenanceService(
  supabase: SupabaseClient,
  companyId: string,
  serviceId: string,
  input: UpdateMaintenanceServiceInput,
  profileId: string,
): Promise<MaintenanceService> {
  const {data, error} = await supabase
    .from('maintenance_services')
    .update({
      description: input.description,
      hours: input.hours,
      amount: input.amount,
      responsible: input.responsible,
      updated_by: profileId,
    })
    .eq('id', serviceId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .select('*')
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  const service = mapMaintenanceServiceRow(data as Parameters<typeof mapMaintenanceServiceRow>[0]);
  await syncMaintenanceFinancialEntry(supabase, companyId, service.maintenanceRecordId, profileId);

  return service;
}

export async function softDeleteMaintenanceService(
  supabase: SupabaseClient,
  companyId: string,
  serviceId: string,
  profileId: string,
): Promise<void> {
  const {data: serviceRow} = await supabase
    .from('maintenance_services')
    .select('maintenance_record_id')
    .eq('id', serviceId)
    .eq('company_id', companyId)
    .maybeSingle();

  const {error} = await supabase
    .from('maintenance_services')
    .update({deleted_at: new Date().toISOString(), updated_by: profileId})
    .eq('id', serviceId)
    .eq('company_id', companyId);

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  if (serviceRow?.maintenance_record_id) {
    await syncMaintenanceFinancialEntry(
      supabase,
      companyId,
      String(serviceRow.maintenance_record_id),
      profileId,
    );
  }
}

export async function listMaintenanceSchedulesByVehicle(
  supabase: SupabaseClient,
  companyId: string,
  vehicleId: string,
): Promise<MaintenanceSchedule[]> {
  const {data, error} = await supabase
    .from('maintenance_schedules')
    .select('*, vehicles:vehicle_id (id, plate, model)')
    .eq('company_id', companyId)
    .eq('vehicle_id', vehicleId)
    .is('deleted_at', null)
    .order('next_due_at', {ascending: true});

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return (data ?? []).map((row) =>
    mapMaintenanceScheduleRow(row as Parameters<typeof mapMaintenanceScheduleRow>[0]),
  );
}

export async function getMaintenanceRecordDetailRow(
  supabase: SupabaseClient,
  companyId: string,
  maintenanceRecordId: string,
) {
  const {data, error} = await supabase
    .from('maintenance_records')
    .select(MAINTENANCE_DETAIL_COLUMNS)
    .eq('id', maintenanceRecordId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  if (!data) return null;

  const row = data as unknown as MaintenanceRecordRow;
  return {
    record: mapMaintenanceRecordRow(row),
    linkedTrip: getLinkedTripFromRow(row),
  };
}
