import type {SupabaseClient} from '@supabase/supabase-js';

import {mapDatabaseError} from '@/features/master/companies/utils/database-error';

import {
  TIRE_DETAIL_COLUMNS,
  TIRE_LIST_COLUMNS,
  TIRE_PAGE_SIZE,
  TIRE_STORAGE_BUCKET,
} from '../constants';
import {
  mapTireDocumentRow,
  mapTireHistoryRow,
  mapTireInspectionRow,
  mapTireMovementRow,
  mapTireRecapRow,
  mapTireRow,
} from '../services/mappers';
import type {
  PaginatedTires,
  Tire,
  TireDocument,
  TireHistory,
  TireInspection,
  TireListFilters,
  TireMovement,
  TireRecap,
  TireSortOptions,
  TireStats,
  TireVehicleWearRanking,
} from '../types';
import type {TireRow} from '../types/tire';
import type {
  CreateTireInput,
  CreateTireInspectionInput,
  CreateTireMovementInput,
  CreateTireRecapInput,
  UpdateTireInput,
  UploadTireFileInput,
} from '../validation';

export interface ListTiresOptions {
  companyId: string;
  search?: string;
  page?: number;
  pageSize?: number;
  filters?: TireListFilters;
  sort?: TireSortOptions;
}

const SORT_COLUMNS: Record<NonNullable<TireSortOptions['sortBy']>, string> = {
  created_at: 'created_at',
  asset_number: 'asset_number',
  brand: 'brand',
  accumulated_km: 'accumulated_km',
  tire_status: 'tire_status',
  purchase_date: 'purchase_date',
};

function sanitizeSearchTerm(value: string): string {
  return value.replace(/[%(),]/g, '').trim();
}

function buildTirePayload(
  input: CreateTireInput | UpdateTireInput,
  profileId: string,
  isCreate: boolean,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    branch_id: input.branchId,
    vehicle_id: input.vehicleId,
    maintenance_record_id: input.maintenanceRecordId,
    asset_number: input.assetNumber,
    internal_code: input.internalCode,
    brand: input.brand,
    model: input.model,
    tire_size: input.tireSize,
    manufacturer: input.manufacturer,
    dot_number: input.dotNumber,
    fire_number: input.fireNumber,
    serial_number: input.serialNumber,
    expected_life_km: input.expectedLifeKm,
    current_km: input.currentKm ?? 0,
    accumulated_km: input.accumulatedKm ?? 0,
    purchase_date: input.purchaseDate,
    purchase_value: input.purchaseValue,
    supplier: input.supplier,
    warranty: input.warranty,
    tire_status: input.tireStatus,
    current_position: input.currentPosition,
    notes: input.notes,
    updated_by: profileId,
  };

  if (isCreate) {
    payload.created_by = profileId;
  }

  return payload;
}

export async function listTires(
  supabase: SupabaseClient,
  options: ListTiresOptions,
): Promise<PaginatedTires> {
  const search = sanitizeSearchTerm(options.search ?? '');
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? TIRE_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const filters = options.filters ?? {};
  const sortBy = options.sort?.sortBy ?? 'created_at';
  const sortOrder = options.sort?.sortOrder ?? 'desc';
  const ascending = sortOrder === 'asc';
  const sortColumn = SORT_COLUMNS[sortBy] ?? 'created_at';

  let query = supabase
    .from('tires')
    .select(TIRE_LIST_COLUMNS, {count: 'exact'})
    .eq('company_id', options.companyId)
    .is('deleted_at', null);

  if (filters.vehicleId) query = query.eq('vehicle_id', filters.vehicleId);
  if (filters.branchId) query = query.eq('branch_id', filters.branchId);
  if (filters.tireStatus) query = query.eq('tire_status', filters.tireStatus);
  if (filters.brand) query = query.ilike('brand', `%${filters.brand}%`);
  if (filters.supplier) query = query.ilike('supplier', `%${filters.supplier}%`);
  if (filters.position) query = query.eq('current_position', filters.position);
  if (filters.hasRecap) query = query.gt('recap_count', 0);

  if (search) {
    query = query.or(
      `asset_number.ilike.%${search}%,internal_code.ilike.%${search}%,brand.ilike.%${search}%,model.ilike.%${search}%,fire_number.ilike.%${search}%,serial_number.ilike.%${search}%,supplier.ilike.%${search}%`,
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
    items: (data ?? []).map((row) => mapTireRow(row as unknown as TireRow)),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getTireById(
  supabase: SupabaseClient,
  companyId: string,
  tireId: string,
): Promise<Tire | null> {
  const {data, error} = await supabase
    .from('tires')
    .select(TIRE_DETAIL_COLUMNS)
    .eq('id', tireId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  if (!data) return null;
  return mapTireRow(data as unknown as TireRow);
}

export async function listTiresByMaintenanceRecordId(
  supabase: SupabaseClient,
  companyId: string,
  maintenanceRecordId: string,
): Promise<Tire[]> {
  const {data, error} = await supabase
    .from('tires')
    .select(TIRE_LIST_COLUMNS)
    .eq('company_id', companyId)
    .eq('maintenance_record_id', maintenanceRecordId)
    .is('deleted_at', null)
    .order('current_position', {ascending: true});

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return (data ?? []).map((row) => mapTireRow(row as unknown as TireRow));
}

export async function createTire(
  supabase: SupabaseClient,
  companyId: string,
  input: CreateTireInput,
  profileId: string,
): Promise<Tire> {
  const payload = buildTirePayload(input, profileId, true);

  const {data, error} = await supabase
    .from('tires')
    .insert({...payload, company_id: companyId})
    .select(TIRE_DETAIL_COLUMNS)
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  const tire = mapTireRow(data as unknown as TireRow);

  try {
    const {onTireCostUpdated} = await import('@/features/financial/services/integration-events');
    await onTireCostUpdated(supabase, companyId, tire, profileId);
  } catch {
    // Financial integration must not block tire operations
  }

  return tire;
}

export async function updateTire(
  supabase: SupabaseClient,
  companyId: string,
  tireId: string,
  input: UpdateTireInput,
  profileId: string,
): Promise<Tire> {
  const payload = buildTirePayload(input, profileId, false);

  const {data, error} = await supabase
    .from('tires')
    .update(payload)
    .eq('id', tireId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .select(TIRE_DETAIL_COLUMNS)
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  const tire = mapTireRow(data as unknown as TireRow);

  try {
    const {onTireCostUpdated} = await import('@/features/financial/services/integration-events');
    await onTireCostUpdated(supabase, companyId, tire, profileId);
  } catch {
    // Financial integration must not block tire operations
  }

  return tire;
}

export async function softDeleteTire(
  supabase: SupabaseClient,
  companyId: string,
  tireId: string,
  profileId: string,
): Promise<void> {
  try {
    const {onLinkedFinancialEntryDeleted} = await import(
      '@/features/financial/services/integration-events'
    );
    await onLinkedFinancialEntryDeleted(supabase, companyId, profileId, {tireId});
  } catch {
    // Financial integration must not block tire operations
  }

  const {error} = await supabase
    .from('tires')
    .update({
      deleted_at: new Date().toISOString(),
      status: 'archived',
      updated_by: profileId,
    })
    .eq('id', tireId)
    .eq('company_id', companyId)
    .is('deleted_at', null);

  if (error) {
    throw new Error(mapDatabaseError(error));
  }
}

export async function listTireHistory(
  supabase: SupabaseClient,
  companyId: string,
  tireId: string,
): Promise<TireHistory[]> {
  const {data, error} = await supabase
    .from('tire_history')
    .select('id, company_id, tire_id, action, changes, created_at, created_by')
    .eq('company_id', companyId)
    .eq('tire_id', tireId)
    .is('deleted_at', null)
    .order('created_at', {ascending: false});

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return (data ?? []).map((row) => mapTireHistoryRow(row));
}

export async function listTireMovements(
  supabase: SupabaseClient,
  companyId: string,
  tireId: string,
): Promise<TireMovement[]> {
  const {data, error} = await supabase
    .from('tire_movements')
    .select(
      'id, company_id, tire_id, vehicle_id, movement_type, position, installed_at, removed_at, reason, responsible, odometer_km, notes, created_at, deleted_at, vehicles:vehicle_id (id, plate)',
    )
    .eq('company_id', companyId)
    .eq('tire_id', tireId)
    .is('deleted_at', null)
    .order('created_at', {ascending: false});

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return (data ?? []).map((row) => mapTireMovementRow(row));
}

export async function listTireInspections(
  supabase: SupabaseClient,
  companyId: string,
  tireId: string,
): Promise<TireInspection[]> {
  const {data, error} = await supabase
    .from('tire_inspections')
    .select(
      'id, company_id, tire_id, tread_depth_mm, pressure_psi, wear_level, inspected_at, responsible, notes, created_at, deleted_at',
    )
    .eq('company_id', companyId)
    .eq('tire_id', tireId)
    .is('deleted_at', null)
    .order('inspected_at', {ascending: false});

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return (data ?? []).map((row) => mapTireInspectionRow(row));
}

export async function listTireRecaps(
  supabase: SupabaseClient,
  companyId: string,
  tireId: string,
): Promise<TireRecap[]> {
  const {data, error} = await supabase
    .from('tire_recaps')
    .select(
      'id, company_id, tire_id, supplier, recap_number, amount, odometer_km, recapped_at, warranty, notes, created_at, deleted_at',
    )
    .eq('company_id', companyId)
    .eq('tire_id', tireId)
    .is('deleted_at', null)
    .order('recapped_at', {ascending: false});

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return (data ?? []).map((row) => mapTireRecapRow(row));
}

export async function listTireDocuments(
  supabase: SupabaseClient,
  companyId: string,
  tireId: string,
): Promise<TireDocument[]> {
  const {data, error} = await supabase
    .from('tire_documents')
    .select(
      'id, company_id, tire_id, name, file_url, storage_path, document_type, mime_type, file_size, created_at, deleted_at, created_by',
    )
    .eq('company_id', companyId)
    .eq('tire_id', tireId)
    .is('deleted_at', null)
    .order('created_at', {ascending: false});

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return (data ?? []).map((row) => mapTireDocumentRow(row));
}

export async function listTiresByVehicle(
  supabase: SupabaseClient,
  companyId: string,
  vehicleId: string,
): Promise<Tire[]> {
  const {data, error} = await supabase
    .from('tires')
    .select(TIRE_LIST_COLUMNS)
    .eq('company_id', companyId)
    .eq('vehicle_id', vehicleId)
    .eq('tire_status', 'installed')
    .is('deleted_at', null)
    .order('current_position', {ascending: true});

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return (data ?? []).map((row) => mapTireRow(row as unknown as TireRow));
}

export async function createTireMovement(
  supabase: SupabaseClient,
  companyId: string,
  input: CreateTireMovementInput,
  profileId: string,
): Promise<TireMovement> {
  const tire = await getTireById(supabase, companyId, input.tireId);
  if (!tire) throw new Error('Pneu não encontrado.');

  const {data, error} = await supabase
    .from('tire_movements')
    .insert({
      company_id: companyId,
      branch_id: input.branchId ?? tire.branchId,
      vehicle_id: input.vehicleId,
      maintenance_record_id: input.maintenanceRecordId ?? tire.maintenanceRecordId,
      tire_id: input.tireId,
      movement_type: input.movementType,
      position: input.position,
      installed_at: input.installedAt,
      removed_at: input.removedAt,
      reason: input.reason,
      responsible: input.responsible,
      odometer_km: input.odometerKm,
      notes: input.notes,
      created_by: profileId,
      updated_by: profileId,
    })
    .select(
      'id, company_id, tire_id, vehicle_id, movement_type, position, installed_at, removed_at, reason, responsible, odometer_km, notes, created_at, deleted_at, vehicles:vehicle_id (id, plate)',
    )
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapTireMovementRow(data);
}

export async function createTireInspection(
  supabase: SupabaseClient,
  companyId: string,
  input: CreateTireInspectionInput,
  profileId: string,
): Promise<TireInspection> {
  const tire = await getTireById(supabase, companyId, input.tireId);
  if (!tire) throw new Error('Pneu não encontrado.');

  const {data, error} = await supabase
    .from('tire_inspections')
    .insert({
      company_id: companyId,
      branch_id: tire.branchId,
      vehicle_id: tire.vehicleId,
      maintenance_record_id: tire.maintenanceRecordId,
      tire_id: input.tireId,
      tread_depth_mm: input.treadDepthMm,
      pressure_psi: input.pressurePsi,
      wear_level: input.wearLevel,
      inspected_at: input.inspectedAt,
      responsible: input.responsible,
      notes: input.notes,
      created_by: profileId,
      updated_by: profileId,
    })
    .select(
      'id, company_id, tire_id, tread_depth_mm, pressure_psi, wear_level, inspected_at, responsible, notes, created_at, deleted_at',
    )
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapTireInspectionRow(data);
}

export async function createTireRecap(
  supabase: SupabaseClient,
  companyId: string,
  input: CreateTireRecapInput,
  profileId: string,
): Promise<TireRecap> {
  const tire = await getTireById(supabase, companyId, input.tireId);
  if (!tire) throw new Error('Pneu não encontrado.');

  const {data, error} = await supabase
    .from('tire_recaps')
    .insert({
      company_id: companyId,
      branch_id: tire.branchId,
      vehicle_id: tire.vehicleId,
      maintenance_record_id: tire.maintenanceRecordId,
      tire_id: input.tireId,
      supplier: input.supplier,
      recap_number: input.recapNumber,
      amount: input.amount,
      odometer_km: input.odometerKm,
      recapped_at: input.recappedAt,
      warranty: input.warranty,
      notes: input.notes,
      created_by: profileId,
      updated_by: profileId,
    })
    .select(
      'id, company_id, tire_id, supplier, recap_number, amount, odometer_km, recapped_at, warranty, notes, created_at, deleted_at',
    )
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  const recap = mapTireRecapRow(data);
  const updatedTire = await getTireById(supabase, companyId, input.tireId);
  if (updatedTire) {
    try {
      const {onTireCostUpdated} = await import('@/features/financial/services/integration-events');
      await onTireCostUpdated(supabase, companyId, updatedTire, profileId);
    } catch {
      // Financial integration must not block tire operations
    }
  }

  return recap;
}

export async function createTireDocument(
  supabase: SupabaseClient,
  companyId: string,
  input: UploadTireFileInput,
  profileId: string,
): Promise<TireDocument> {
  const tire = await getTireById(supabase, companyId, input.tireId);
  if (!tire) throw new Error('Pneu não encontrado.');

  const {data, error} = await supabase
    .from('tire_documents')
    .insert({
      company_id: companyId,
      branch_id: tire.branchId,
      vehicle_id: tire.vehicleId,
      maintenance_record_id: tire.maintenanceRecordId,
      tire_id: input.tireId,
      name: input.name,
      file_url: input.fileUrl,
      storage_path: input.storagePath,
      document_type: input.documentType,
      mime_type: input.mimeType,
      file_size: input.fileSize,
      created_by: profileId,
      updated_by: profileId,
    })
    .select(
      'id, company_id, tire_id, name, file_url, storage_path, document_type, mime_type, file_size, created_at, deleted_at, created_by',
    )
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapTireDocumentRow(data);
}

export async function softDeleteTireDocument(
  supabase: SupabaseClient,
  companyId: string,
  documentId: string,
  profileId: string,
): Promise<void> {
  const {error} = await supabase
    .from('tire_documents')
    .update({deleted_at: new Date().toISOString(), updated_by: profileId})
    .eq('id', documentId)
    .eq('company_id', companyId)
    .is('deleted_at', null);

  if (error) {
    throw new Error(mapDatabaseError(error));
  }
}

export async function getTireStats(
  supabase: SupabaseClient,
  companyId: string,
): Promise<TireStats> {
  const {data, error} = await supabase.rpc('get_tire_stats', {p_company_id: companyId});

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  const stats = (data ?? {}) as Record<string, unknown>;
  const topVehicles = Array.isArray(stats.top_vehicles_by_wear)
    ? (stats.top_vehicles_by_wear as Record<string, unknown>[]).map(
        (item): TireVehicleWearRanking => ({
          vehicleId: String(item.vehicle_id ?? ''),
          vehiclePlate: String(item.vehicle_plate ?? ''),
          avgTreadMm: Number(item.avg_tread_mm ?? 0),
          tireCount: Number(item.tire_count ?? 0),
        }),
      )
    : [];

  return {
    total: Number(stats.total ?? 0),
    installed: Number(stats.installed ?? 0),
    inStock: Number(stats.in_stock ?? 0),
    discarded: Number(stats.discarded ?? 0),
    inRetread: Number(stats.in_retread ?? 0),
    averageKm: Number(stats.average_km ?? 0),
    averageCostPerKm: Number(stats.average_cost_per_km ?? 0),
    replacementDue: Number(stats.replacement_due ?? 0),
    topVehiclesByWear: topVehicles,
  };
}

export {TIRE_STORAGE_BUCKET};
