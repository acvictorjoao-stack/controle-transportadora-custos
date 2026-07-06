import type {SupabaseClient} from '@supabase/supabase-js';

import {mapDatabaseError} from '@/features/master/companies/utils/database-error';

import {VEHICLE_TYPE_OPTIONS} from '../constants/enums';
import {
  VEHICLE_DETAIL_COLUMNS,
  VEHICLE_LIST_COLUMNS,
  VEHICLE_STORAGE_BUCKET,
  VEHICLES_PAGE_SIZE,
} from '../constants';
import {
  mapVehicleDocumentRow,
  mapVehicleHistoryRow,
  mapVehicleRow,
} from '../services/mappers';
import type {
  PaginatedVehicles,
  Vehicle,
  VehicleSelectOption,
  VehicleDocument,
  VehicleHistory,
  VehicleListFilters,
  VehicleRow,
  VehicleSortOptions,
  VehicleStats,
} from '../types';
import type {CreateVehicleInput, UpdateVehicleInput} from '../validation';

export interface ListVehiclesOptions {
  companyId: string;
  search?: string;
  page?: number;
  pageSize?: number;
  filters?: VehicleListFilters;
  sort?: VehicleSortOptions;
}

const SORT_COLUMNS: Record<NonNullable<VehicleSortOptions['sortBy']>, string> = {
  plate: 'plate',
  fleet_number: 'fleet_number',
  brand: 'brand',
  asset_status: 'asset_status',
  created_at: 'created_at',
};

function sanitizeSearchTerm(value: string): string {
  return value.replace(/[%(),]/g, '').trim();
}

function buildVehiclePayload(
  input: CreateVehicleInput | UpdateVehicleInput,
  profileId: string,
  isCreate: boolean,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    plate: input.plate,
    fleet_number: input.fleetNumber,
    vehicle_type: input.vehicleType,
    body_type: input.bodyType,
    brand: input.brand,
    model: input.model,
    year: input.year,
    renavam: input.renavam,
    chassis: input.chassis,
    color: input.color,
    fuel_type: input.fuelType ?? null,
    load_capacity_kg: input.loadCapacityKg,
    gross_weight_kg: input.grossWeightKg,
    tare_kg: input.tareKg,
    axles: input.axles,
    hour_meter: input.hourMeter,
    asset_status: input.assetStatus ?? 'active',
    branch_id: input.branchId,
    notes: input.notes,
    updated_by: profileId,
  };

  if (isCreate) {
    payload.initial_odometer_km = input.initialOdometerKm ?? 0;
    payload.current_odometer_km = input.initialOdometerKm ?? 0;
    payload.created_by = profileId;
  } else if ('currentOdometerKm' in input && input.currentOdometerKm !== undefined) {
    payload.current_odometer_km = input.currentOdometerKm;
  }

  return payload;
}

export async function listVehicles(
  supabase: SupabaseClient,
  options: ListVehiclesOptions,
): Promise<PaginatedVehicles> {
  const search = sanitizeSearchTerm(options.search ?? '');
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? VEHICLES_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const filters = options.filters ?? {};
  const sortBy = options.sort?.sortBy ?? 'plate';
  const sortOrder = options.sort?.sortOrder ?? 'asc';
  const ascending = sortOrder === 'asc';
  const sortColumn = SORT_COLUMNS[sortBy] ?? 'plate';

  let query = supabase
    .from('vehicles')
    .select(VEHICLE_LIST_COLUMNS, {count: 'exact'})
    .eq('company_id', options.companyId)
    .is('deleted_at', null);

  if (filters.plate) {
    query = query.ilike('plate', `%${filters.plate.trim()}%`);
  }
  if (filters.fleetNumber) {
    query = query.ilike('fleet_number', `%${filters.fleetNumber.trim()}%`);
  }
  if (filters.assetStatus) {
    query = query.eq('asset_status', filters.assetStatus);
  }
  if (filters.branchId) {
    query = query.eq('branch_id', filters.branchId);
  }
  if (filters.vehicleType) {
    const type = filters.vehicleType.trim();
    if ((VEHICLE_TYPE_OPTIONS as readonly string[]).includes(type)) {
      query = query.eq('vehicle_type', type);
    } else {
      query = query.ilike('vehicle_type', `%${type}%`);
    }
  }
  if (filters.brand) {
    query = query.ilike('brand', `%${filters.brand.trim()}%`);
  }

  if (search) {
    query = query.or(
      `plate.ilike.%${search}%,fleet_number.ilike.%${search}%,brand.ilike.%${search}%,model.ilike.%${search}%`,
    );
  }

  const {data, error, count} = await query
    .order(sortColumn, {ascending})
    .range(from, to);

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  const total = count ?? 0;

  return {
    items: (data ?? []).map((row) => mapVehicleRow(row as unknown as VehicleRow)),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function listVehiclesForSelect(
  supabase: SupabaseClient,
  companyId: string,
  limit = 100,
): Promise<VehicleSelectOption[]> {
  const {data, error} = await supabase
    .from('vehicles')
    .select('id, plate, model')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('plate')
    .limit(limit);

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    plate: row.plate,
    model: row.model,
  }));
}

export async function getVehicleById(
  supabase: SupabaseClient,
  companyId: string,
  vehicleId: string,
): Promise<Vehicle | null> {
  const {data, error} = await supabase
    .from('vehicles')
    .select(VEHICLE_DETAIL_COLUMNS)
    .eq('id', vehicleId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  if (!data) return null;
  return mapVehicleRow(data as unknown as VehicleRow);
}

export async function createVehicle(
  supabase: SupabaseClient,
  companyId: string,
  input: CreateVehicleInput,
  profileId: string,
): Promise<Vehicle> {
  const payload = buildVehiclePayload(input, profileId, true);

  const {data, error} = await supabase
    .from('vehicles')
    .insert({...payload, company_id: companyId})
    .select(VEHICLE_DETAIL_COLUMNS)
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapVehicleRow(data as unknown as VehicleRow);
}

export async function updateVehicle(
  supabase: SupabaseClient,
  companyId: string,
  vehicleId: string,
  input: UpdateVehicleInput,
  profileId: string,
): Promise<Vehicle> {
  const payload = buildVehiclePayload(input, profileId, false);

  const {data, error} = await supabase
    .from('vehicles')
    .update(payload)
    .eq('id', vehicleId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .select(VEHICLE_DETAIL_COLUMNS)
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapVehicleRow(data as unknown as VehicleRow);
}

export async function softDeleteVehicle(
  supabase: SupabaseClient,
  companyId: string,
  vehicleId: string,
  profileId: string,
): Promise<void> {
  const {error} = await supabase
    .from('vehicles')
    .update({
      deleted_at: new Date().toISOString(),
      status: 'archived',
      updated_by: profileId,
    })
    .eq('id', vehicleId)
    .eq('company_id', companyId);

  if (error) {
    throw new Error(mapDatabaseError(error));
  }
}

export async function updateVehicleAssetStatus(
  supabase: SupabaseClient,
  companyId: string,
  vehicleId: string,
  assetStatus: Vehicle['assetStatus'],
  profileId: string,
): Promise<Vehicle> {
  const {data, error} = await supabase
    .from('vehicles')
    .update({asset_status: assetStatus, updated_by: profileId})
    .eq('id', vehicleId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .select(VEHICLE_DETAIL_COLUMNS)
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapVehicleRow(data as unknown as VehicleRow);
}

export async function updateVehicleFileUrl(
  supabase: SupabaseClient,
  companyId: string,
  vehicleId: string,
  field: 'photo_url' | 'crlv_url',
  fileUrl: string | null,
  profileId: string,
  storagePath?: string | null,
): Promise<Vehicle> {
  const storageField = field === 'photo_url' ? 'photo_storage_path' : 'crlv_storage_path';

  const {data, error} = await supabase
    .from('vehicles')
    .update({
      [field]: fileUrl,
      [storageField]: storagePath ?? null,
      updated_by: profileId,
    })
    .eq('id', vehicleId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .select(VEHICLE_DETAIL_COLUMNS)
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapVehicleRow(data as unknown as VehicleRow);
}

export async function countVehicles(
  supabase: SupabaseClient,
  companyId: string,
): Promise<number> {
  const {count, error} = await supabase
    .from('vehicles')
    .select('id', {count: 'exact', head: true})
    .eq('company_id', companyId)
    .is('deleted_at', null);

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return count ?? 0;
}

export async function getVehicleStats(
  supabase: SupabaseClient,
  companyId: string,
): Promise<VehicleStats> {
  const {data, error} = await supabase.rpc('get_vehicle_stats', {
    p_company_id: companyId,
  });

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  const stats = (data ?? {}) as Record<string, unknown>;

  return {
    total: Number(stats.total ?? 0),
    active: Number(stats.active ?? 0),
    maintenance: Number(stats.maintenance ?? 0),
    inactive: Number(stats.inactive ?? 0),
    sold: Number(stats.sold ?? 0),
    averageOdometerKm: Number(stats.average_odometer_km ?? 0),
  };
}

export async function listVehicleHistory(
  supabase: SupabaseClient,
  companyId: string,
  vehicleId: string,
): Promise<VehicleHistory[]> {
  const {data, error} = await supabase
    .from('vehicle_history')
    .select('*')
    .eq('company_id', companyId)
    .eq('vehicle_id', vehicleId)
    .order('created_at', {ascending: false});

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return (data ?? []).map((row) =>
    mapVehicleHistoryRow(row as Parameters<typeof mapVehicleHistoryRow>[0]),
  );
}

export async function listVehicleDocuments(
  supabase: SupabaseClient,
  companyId: string,
  vehicleId: string,
): Promise<VehicleDocument[]> {
  const {data, error} = await supabase
    .from('vehicle_documents')
    .select('*')
    .eq('company_id', companyId)
    .eq('vehicle_id', vehicleId)
    .is('deleted_at', null)
    .order('created_at', {ascending: false});

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return (data ?? []).map((row) =>
    mapVehicleDocumentRow(row as Parameters<typeof mapVehicleDocumentRow>[0]),
  );
}

export async function createVehicleDocument(
  supabase: SupabaseClient,
  companyId: string,
  vehicleId: string,
  input: {
    name: string;
    fileUrl: string;
    storagePath: string;
    documentType: string;
    mimeType?: string | null;
    fileSize?: number | null;
  },
  profileId: string,
): Promise<VehicleDocument> {
  const {data, error} = await supabase
    .from('vehicle_documents')
    .insert({
      company_id: companyId,
      vehicle_id: vehicleId,
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

  return mapVehicleDocumentRow(
    data as Parameters<typeof mapVehicleDocumentRow>[0],
  );
}

export async function softDeleteVehicleDocument(
  supabase: SupabaseClient,
  companyId: string,
  documentId: string,
): Promise<void> {
  const {data: document, error: fetchError} = await supabase
    .from('vehicle_documents')
    .select('storage_path')
    .eq('id', documentId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .maybeSingle();

  if (fetchError) {
    throw new Error(mapDatabaseError(fetchError));
  }

  const {error} = await supabase
    .from('vehicle_documents')
    .update({deleted_at: new Date().toISOString()})
    .eq('id', documentId)
    .eq('company_id', companyId);

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  const storagePath = document?.storage_path;
  if (storagePath) {
    await supabase.storage.from(VEHICLE_STORAGE_BUCKET).remove([storagePath]);
  }
}
