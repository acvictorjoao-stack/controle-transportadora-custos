import type {SupabaseClient} from '@supabase/supabase-js';

import {mapDatabaseError} from '@/features/master/companies/utils/database-error';

import {
  FUEL_DETAIL_COLUMNS,
  FUEL_LIST_COLUMNS,
  FUEL_PAGE_SIZE,
  FUEL_STORAGE_BUCKET,
} from '../constants';
import {
  getVehicleTankCapacity,
  mapFuelDocumentRow,
  mapFuelHistoryRow,
  mapFuelRecordRow,
} from '../services/mappers';
import type {
  FuelDocument,
  FuelHistory,
  FuelRecord,
  FuelRecordRow,
  FuelStats,
  FuelStationRanking,
  FuelBrandRanking,
  FuelEfficiencyEntity,
  FuelListFilters,
  FuelSortOptions,
  PaginatedFuelRecords,
} from '../types';
import {calculateFuelMetrics} from '../services/consumption';
import type {CreateFuelRecordInput, UpdateFuelRecordInput} from '../validation';

export interface ListFuelRecordsOptions {
  companyId: string;
  search?: string;
  page?: number;
  pageSize?: number;
  filters?: FuelListFilters;
  sort?: FuelSortOptions;
}

const SORT_COLUMNS: Record<NonNullable<FuelSortOptions['sortBy']>, string> = {
  fueled_at: 'fueled_at',
  total_amount: 'total_amount',
  quantity_liters: 'quantity_liters',
  km_per_liter: 'km_per_liter',
  created_at: 'created_at',
};

function sanitizeSearchTerm(value: string): string {
  return value.replace(/[%(),]/g, '').trim();
}

async function getPreviousOdometer(
  supabase: SupabaseClient,
  companyId: string,
  vehicleId: string,
  fueledAt: string,
  excludeId?: string,
): Promise<number | null> {
  let query = supabase
    .from('fuel_records')
    .select('odometer_km')
    .eq('company_id', companyId)
    .eq('vehicle_id', vehicleId)
    .is('deleted_at', null)
    .not('odometer_km', 'is', null)
    .lt('fueled_at', fueledAt)
    .order('fueled_at', {ascending: false})
    .limit(1);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const {data, error} = await query.maybeSingle();
  if (error || !data?.odometer_km) return null;
  return Number(data.odometer_km);
}

async function hasDuplicateSameDay(
  supabase: SupabaseClient,
  companyId: string,
  vehicleId: string,
  fueledAt: string,
  excludeId?: string,
): Promise<boolean> {
  const day = fueledAt.slice(0, 10);
  let query = supabase
    .from('fuel_records')
    .select('id', {count: 'exact', head: true})
    .eq('company_id', companyId)
    .eq('vehicle_id', vehicleId)
    .is('deleted_at', null)
    .gte('fueled_at', `${day}T00:00:00.000Z`)
    .lte('fueled_at', `${day}T23:59:59.999Z`);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const {count, error} = await query;
  if (error) return false;
  return (count ?? 0) > 0;
}

async function resolveMetrics(
  supabase: SupabaseClient,
  companyId: string,
  input: CreateFuelRecordInput | UpdateFuelRecordInput,
  vehicleId: string,
  fueledAt: string,
  excludeId?: string,
  tankCapacityLiters?: number | null,
) {
  const [previousOdometerKm, duplicateSameDay] = await Promise.all([
    getPreviousOdometer(supabase, companyId, vehicleId, fueledAt, excludeId),
    hasDuplicateSameDay(supabase, companyId, vehicleId, fueledAt, excludeId),
  ]);

  return calculateFuelMetrics({
    quantityLiters: input.quantityLiters,
    pricePerLiter: input.pricePerLiter ?? 0,
    totalAmount: input.totalAmount ?? 0,
    odometerKm: input.odometerKm ?? null,
    previousOdometerKm,
    fueledAt,
    tankCapacityLiters,
    duplicateSameDay,
  });
}

async function fetchVehicleTankCapacity(
  supabase: SupabaseClient,
  companyId: string,
  vehicleId: string,
): Promise<number | null> {
  const {data} = await supabase
    .from('vehicles')
    .select('tank_capacity_liters')
    .eq('id', vehicleId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .maybeSingle();

  if (!data?.tank_capacity_liters) return null;
  return Number(data.tank_capacity_liters);
}

function buildFuelPayload(
  input: CreateFuelRecordInput | UpdateFuelRecordInput,
  profileId: string,
  metrics: ReturnType<typeof calculateFuelMetrics>,
  isCreate: boolean,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    vehicle_id: input.vehicleId,
    driver_id: input.driverId,
    branch_id: input.branchId,
    station_name: input.stationName,
    station_brand: input.stationBrand,
    city: input.city,
    state: input.state,
    fueled_at: input.fueledAt,
    fuel_type: input.fuelType,
    quantity_liters: input.quantityLiters,
    price_per_liter: input.pricePerLiter,
    total_amount: input.totalAmount,
    odometer_km: input.odometerKm,
    km_traveled: metrics.kmTraveled,
    consumption_l_per_100km: metrics.consumptionLPer100km,
    km_per_liter: metrics.kmPerLiter,
    cost_per_km: metrics.costPerKm,
    autonomy_km: metrics.autonomyKm,
    notes: input.notes,
    responsible: input.responsible,
    is_inconsistent: metrics.isInconsistent,
    inconsistency_flags: metrics.inconsistencyFlags,
    updated_by: profileId,
  };

  if (isCreate) {
    payload.created_by = profileId;
  }

  return payload;
}

export async function listFuelRecords(
  supabase: SupabaseClient,
  options: ListFuelRecordsOptions,
): Promise<PaginatedFuelRecords> {
  const search = sanitizeSearchTerm(options.search ?? '');
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? FUEL_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const filters = options.filters ?? {};
  const sortBy = options.sort?.sortBy ?? 'fueled_at';
  const sortOrder = options.sort?.sortOrder ?? 'desc';
  const ascending = sortOrder === 'asc';
  const sortColumn = SORT_COLUMNS[sortBy] ?? 'fueled_at';

  let query = supabase
    .from('fuel_records')
    .select(FUEL_LIST_COLUMNS, {count: 'exact'})
    .eq('company_id', options.companyId)
    .is('deleted_at', null);

  if (filters.vehicleId) query = query.eq('vehicle_id', filters.vehicleId);
  if (filters.driverId) query = query.eq('driver_id', filters.driverId);
  if (filters.branchId) query = query.eq('branch_id', filters.branchId);
  if (filters.fuelType) query = query.eq('fuel_type', filters.fuelType);
  if (filters.city) query = query.ilike('city', `%${filters.city}%`);
  if (filters.stationName) query = query.ilike('station_name', `%${filters.stationName}%`);
  if (filters.dateFrom) query = query.gte('fueled_at', filters.dateFrom);
  if (filters.dateTo) query = query.lte('fueled_at', `${filters.dateTo}T23:59:59.999Z`);
  if (filters.inconsistentOnly) query = query.eq('is_inconsistent', true);

  if (search) {
    query = query.or(
      `station_name.ilike.%${search}%,station_brand.ilike.%${search}%,city.ilike.%${search}%,responsible.ilike.%${search}%`,
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
    items: (data ?? []).map((row) => mapFuelRecordRow(row as unknown as FuelRecordRow)),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getFuelRecordById(
  supabase: SupabaseClient,
  companyId: string,
  fuelRecordId: string,
): Promise<FuelRecord | null> {
  const {data, error} = await supabase
    .from('fuel_records')
    .select(FUEL_DETAIL_COLUMNS)
    .eq('id', fuelRecordId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  if (!data) return null;
  return mapFuelRecordRow(data as unknown as FuelRecordRow);
}

export async function createFuelRecord(
  supabase: SupabaseClient,
  companyId: string,
  input: CreateFuelRecordInput,
  profileId: string,
): Promise<FuelRecord> {
  const tankCapacity = await fetchVehicleTankCapacity(supabase, companyId, input.vehicleId);
  const metrics = await resolveMetrics(
    supabase,
    companyId,
    input,
    input.vehicleId,
    input.fueledAt,
    undefined,
    tankCapacity,
  );
  const payload = buildFuelPayload(input, profileId, metrics, true);

  const {data, error} = await supabase
    .from('fuel_records')
    .insert({...payload, company_id: companyId})
    .select(FUEL_DETAIL_COLUMNS)
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  const record = mapFuelRecordRow(data as unknown as FuelRecordRow);

  try {
    const {onFuelRecordCreated} = await import('@/features/financial/services/integration-events');
    await onFuelRecordCreated(supabase, companyId, record, profileId);
  } catch {
    // Financial integration must not block fuel operations
  }

  return record;
}

export async function updateFuelRecord(
  supabase: SupabaseClient,
  companyId: string,
  fuelRecordId: string,
  input: UpdateFuelRecordInput,
  profileId: string,
): Promise<FuelRecord> {
  const tankCapacity = await fetchVehicleTankCapacity(supabase, companyId, input.vehicleId);
  const metrics = await resolveMetrics(
    supabase,
    companyId,
    input,
    input.vehicleId,
    input.fueledAt,
    fuelRecordId,
    tankCapacity,
  );
  const payload = buildFuelPayload(input, profileId, metrics, false);

  const {data, error} = await supabase
    .from('fuel_records')
    .update(payload)
    .eq('id', fuelRecordId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .select(FUEL_DETAIL_COLUMNS)
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  const record = mapFuelRecordRow(data as unknown as FuelRecordRow);

  try {
    const {onFuelRecordUpdated} = await import('@/features/financial/services/integration-events');
    await onFuelRecordUpdated(supabase, companyId, record, profileId);
  } catch {
    // Financial integration must not block fuel operations
  }

  return record;
}

export async function softDeleteFuelRecord(
  supabase: SupabaseClient,
  companyId: string,
  fuelRecordId: string,
  profileId: string,
): Promise<void> {
  try {
    const {onLinkedFinancialEntryDeleted} = await import(
      '@/features/financial/services/integration-events'
    );
    await onLinkedFinancialEntryDeleted(supabase, companyId, profileId, {fuelRecordId});
  } catch {
    // Financial integration must not block fuel operations
  }

  const {error} = await supabase
    .from('fuel_records')
    .update({
      deleted_at: new Date().toISOString(),
      status: 'archived',
      updated_by: profileId,
    })
    .eq('id', fuelRecordId)
    .eq('company_id', companyId);

  if (error) {
    throw new Error(mapDatabaseError(error));
  }
}

function mapEfficiencyEntity(
  raw: Record<string, unknown> | null | undefined,
  idKey: string,
  nameKey: string,
  plateKey?: string,
): FuelEfficiencyEntity | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = raw[idKey];
  const name = raw[nameKey] ?? raw[plateKey ?? ''];
  const kmPerLiter = raw.km_per_liter;
  if (typeof id !== 'string' || !name) return null;
  return {
    id,
    name: String(name),
    kmPerLiter: Number(kmPerLiter ?? 0),
  };
}

export async function getFuelStats(
  supabase: SupabaseClient,
  companyId: string,
): Promise<FuelStats> {
  const {data, error} = await supabase.rpc('get_fuel_stats', {
    p_company_id: companyId,
  });

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  const stats = (data ?? {}) as Record<string, unknown>;

  const topStationsRaw = Array.isArray(stats.top_stations) ? stats.top_stations : [];
  const topBrandsRaw = Array.isArray(stats.top_brands) ? stats.top_brands : [];

  const topStations: FuelStationRanking[] = topStationsRaw.map((item) => {
    const row = item as Record<string, unknown>;
    return {
      stationName: String(row.station_name ?? ''),
      refuelCount: Number(row.refuel_count ?? 0),
      totalSpent: Number(row.total_spent ?? 0),
    };
  });

  const topBrands: FuelBrandRanking[] = topBrandsRaw.map((item) => {
    const row = item as Record<string, unknown>;
    return {
      stationBrand: String(row.station_brand ?? ''),
      refuelCount: Number(row.refuel_count ?? 0),
      totalSpent: Number(row.total_spent ?? 0),
    };
  });

  return {
    total: Number(stats.total ?? 0),
    totalLiters: Number(stats.total_liters ?? 0),
    totalAmount: Number(stats.total_amount ?? 0),
    averagePricePerLiter: Number(stats.average_price_per_liter ?? 0),
    averageConsumptionLPer100km: Number(stats.average_consumption_l_per_100km ?? 0),
    averageKmPerLiter: Number(stats.average_km_per_liter ?? 0),
    mostEconomicalVehicle: mapEfficiencyEntity(
      stats.most_economical_vehicle as Record<string, unknown>,
      'vehicle_id',
      'vehicle_plate',
      'vehicle_plate',
    ),
    leastEconomicalVehicle: mapEfficiencyEntity(
      stats.least_economical_vehicle as Record<string, unknown>,
      'vehicle_id',
      'vehicle_plate',
      'vehicle_plate',
    ),
    mostEconomicalDriver: mapEfficiencyEntity(
      stats.most_economical_driver as Record<string, unknown>,
      'driver_id',
      'driver_name',
    ),
    leastEconomicalDriver: mapEfficiencyEntity(
      stats.least_economical_driver as Record<string, unknown>,
      'driver_id',
      'driver_name',
    ),
    topStations,
    topBrands,
    inconsistentCount: Number(stats.inconsistent_count ?? 0),
  };
}

export async function listFuelHistory(
  supabase: SupabaseClient,
  companyId: string,
  fuelRecordId: string,
): Promise<FuelHistory[]> {
  const {data, error} = await supabase
    .from('fuel_history')
    .select('*')
    .eq('company_id', companyId)
    .eq('fuel_record_id', fuelRecordId)
    .order('created_at', {ascending: false});

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return (data ?? []).map((row) =>
    mapFuelHistoryRow(row as Parameters<typeof mapFuelHistoryRow>[0]),
  );
}

export async function listFuelDocuments(
  supabase: SupabaseClient,
  companyId: string,
  fuelRecordId: string,
): Promise<FuelDocument[]> {
  const {data, error} = await supabase
    .from('fuel_documents')
    .select('*')
    .eq('company_id', companyId)
    .eq('fuel_record_id', fuelRecordId)
    .is('deleted_at', null)
    .order('created_at', {ascending: false});

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return (data ?? []).map((row) =>
    mapFuelDocumentRow(row as Parameters<typeof mapFuelDocumentRow>[0]),
  );
}

export async function createFuelDocument(
  supabase: SupabaseClient,
  companyId: string,
  fuelRecordId: string,
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
): Promise<FuelDocument> {
  const {data, error} = await supabase
    .from('fuel_documents')
    .insert({
      company_id: companyId,
      fuel_record_id: fuelRecordId,
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

  return mapFuelDocumentRow(data as Parameters<typeof mapFuelDocumentRow>[0]);
}

export async function softDeleteFuelDocument(
  supabase: SupabaseClient,
  companyId: string,
  documentId: string,
): Promise<void> {
  const {data: document, error: fetchError} = await supabase
    .from('fuel_documents')
    .select('storage_path')
    .eq('id', documentId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .maybeSingle();

  if (fetchError) {
    throw new Error(mapDatabaseError(fetchError));
  }

  const {error} = await supabase
    .from('fuel_documents')
    .update({deleted_at: new Date().toISOString()})
    .eq('id', documentId)
    .eq('company_id', companyId);

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  const storagePath = document?.storage_path;
  if (storagePath) {
    await supabase.storage.from(FUEL_STORAGE_BUCKET).remove([storagePath]);
  }
}

export async function getFuelRecordDetailRow(
  supabase: SupabaseClient,
  companyId: string,
  fuelRecordId: string,
) {
  const {data, error} = await supabase
    .from('fuel_records')
    .select(FUEL_DETAIL_COLUMNS)
    .eq('id', fuelRecordId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  if (!data) return null;

  const row = data as unknown as FuelRecordRow;
  return {
    record: mapFuelRecordRow(row),
    tankCapacity: getVehicleTankCapacity(row),
  };
}
