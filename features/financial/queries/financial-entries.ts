import type {SupabaseClient} from '@supabase/supabase-js';

import {mapDatabaseError} from '@/features/master/companies/utils/database-error';

import {
  FINANCIAL_DETAIL_COLUMNS,
  FINANCIAL_LIST_COLUMNS,
  FINANCIAL_PAGE_SIZE,
  FINANCIAL_STORAGE_BUCKET,
} from '../constants';
import {
  mapFinancialDocumentRow,
  mapFinancialEntryRow,
  mapFinancialHistoryRow,
} from '../services/mappers';
import type {
  FinancialCategory,
  FinancialCostCenter,
  FinancialDetailData,
  FinancialDocument,
  FinancialEntry,
  FinancialEntryRow,
  FinancialHistory,
  FinancialListFilters,
  FinancialSortOptions,
  FinancialStats,
  PaginatedFinancialEntries,
} from '../types';
import type {CreateFinancialEntryInput, UpdateFinancialEntryInput} from '../validation';

export interface ListFinancialEntriesOptions {
  companyId: string;
  search?: string;
  page?: number;
  pageSize?: number;
  filters?: FinancialListFilters;
  sort?: FinancialSortOptions;
}

const SORT_COLUMNS: Record<NonNullable<FinancialSortOptions['sortBy']>, string> = {
  entry_date: 'entry_date',
  due_date: 'due_date',
  amount: 'amount',
  entry_type: 'entry_type',
  entry_status: 'entry_status',
  created_at: 'created_at',
};

function sanitizeSearchTerm(value: string): string {
  return value.replace(/[%(),]/g, '').trim();
}

function buildEntryPayload(
  input: CreateFinancialEntryInput | UpdateFinancialEntryInput,
  profileId: string,
  isCreate: boolean,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    branch_id: input.branchId,
    vehicle_id: input.vehicleId,
    driver_id: input.driverId,
    trip_id: input.tripId,
    category_id: input.categoryId,
    cost_center_id: input.costCenterId,
    entry_type: input.entryType,
    entry_status: input.entryStatus ?? 'pending',
    description: input.description,
    reference_number: input.referenceNumber,
    supplier: input.supplier ?? null,
    client: input.client ?? null,
    amount: input.amount,
    currency: input.currency ?? 'BRL',
    entry_date: input.entryDate,
    due_date: input.dueDate,
    notes: input.notes,
    updated_by: profileId,
  };

  if (isCreate) {
    payload.created_by = profileId;
  }

  return payload;
}

export async function ensureFinancialDefaults(
  supabase: SupabaseClient,
  companyId: string,
): Promise<void> {
  const {error} = await supabase.rpc('seed_financial_defaults_for_company', {
    p_company_id: companyId,
    p_created_by: null,
  });

  if (error) {
    throw new Error(mapDatabaseError(error));
  }
}

async function fetchFinancialCategories(
  supabase: SupabaseClient,
  companyId: string,
): Promise<FinancialCategory[]> {
  const {data, error} = await supabase
    .from('financial_categories')
    .select('id, company_id, name, slug, is_system')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .eq('status', 'active')
    .order('name');

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    slug: row.slug,
    isSystem: row.is_system,
  }));
}

async function fetchFinancialCostCenters(
  supabase: SupabaseClient,
  companyId: string,
): Promise<FinancialCostCenter[]> {
  const {data, error} = await supabase
    .from('financial_cost_centers')
    .select('id, company_id, name, center_type, is_system')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .eq('status', 'active')
    .order('name');

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    centerType: row.center_type,
    isSystem: row.is_system,
  }));
}

export async function listFinancialFilterOptions(
  supabase: SupabaseClient,
  companyId: string,
): Promise<{
  categories: FinancialCategory[];
  costCenters: FinancialCostCenter[];
}> {
  await ensureFinancialDefaults(supabase, companyId);

  const [categories, costCenters] = await Promise.all([
    fetchFinancialCategories(supabase, companyId),
    fetchFinancialCostCenters(supabase, companyId),
  ]);

  return {categories, costCenters};
}

export async function listFinancialCategories(
  supabase: SupabaseClient,
  companyId: string,
): Promise<FinancialCategory[]> {
  await ensureFinancialDefaults(supabase, companyId);
  return fetchFinancialCategories(supabase, companyId);
}

export async function listFinancialCostCenters(
  supabase: SupabaseClient,
  companyId: string,
): Promise<FinancialCostCenter[]> {
  await ensureFinancialDefaults(supabase, companyId);
  return fetchFinancialCostCenters(supabase, companyId);
}

export async function getCategoryBySlug(
  supabase: SupabaseClient,
  companyId: string,
  slug: string,
): Promise<FinancialCategory | null> {
  await ensureFinancialDefaults(supabase, companyId);

  const {data, error} = await supabase
    .from('financial_categories')
    .select('id, company_id, name, slug, is_system')
    .eq('company_id', companyId)
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  if (!data) return null;

  return {
    id: data.id,
    companyId: data.company_id,
    name: data.name,
    slug: data.slug,
    isSystem: data.is_system,
  };
}

export async function listFinancialEntries(
  supabase: SupabaseClient,
  options: ListFinancialEntriesOptions,
): Promise<PaginatedFinancialEntries> {
  const search = sanitizeSearchTerm(options.search ?? '');
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? FINANCIAL_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const filters = options.filters ?? {};
  const sortBy = options.sort?.sortBy ?? 'entry_date';
  const sortOrder = options.sort?.sortOrder ?? 'desc';
  const ascending = sortOrder === 'asc';
  const sortColumn = SORT_COLUMNS[sortBy] ?? 'entry_date';

  let query = supabase
    .from('financial_entries')
    .select(FINANCIAL_LIST_COLUMNS, {count: 'exact'})
    .eq('company_id', options.companyId)
    .is('deleted_at', null);

  if (filters.branchId) query = query.eq('branch_id', filters.branchId);
  if (filters.vehicleId) query = query.eq('vehicle_id', filters.vehicleId);
  if (filters.driverId) query = query.eq('driver_id', filters.driverId);
  if (filters.tripId) query = query.eq('trip_id', filters.tripId);
  if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
  if (filters.costCenterId) query = query.eq('cost_center_id', filters.costCenterId);
  if (filters.entryType) query = query.eq('entry_type', filters.entryType);
  if (filters.entryStatus) query = query.eq('entry_status', filters.entryStatus);
  if (filters.sourceModule) query = query.eq('source_module', filters.sourceModule);
  if (filters.supplier) query = query.ilike('supplier', `%${sanitizeSearchTerm(filters.supplier)}%`);
  if (filters.client) query = query.ilike('client', `%${sanitizeSearchTerm(filters.client)}%`);
  if (filters.dateFrom) query = query.gte('entry_date', filters.dateFrom);
  if (filters.dateTo) query = query.lte('entry_date', filters.dateTo);
  if (filters.dueDateFrom) query = query.gte('due_date', filters.dueDateFrom);
  if (filters.dueDateTo) query = query.lte('due_date', filters.dueDateTo);

  if (search) {
    query = query.or(
      `description.ilike.%${search}%,reference_number.ilike.%${search}%,notes.ilike.%${search}%,supplier.ilike.%${search}%,client.ilike.%${search}%`,
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
    items: (data ?? []).map((row) => mapFinancialEntryRow(row as unknown as FinancialEntryRow)),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function listFinancialEntriesByRelation(
  supabase: SupabaseClient,
  companyId: string,
  relation: {
    vehicleId?: string;
    driverId?: string;
    tripId?: string;
    fuelRecordId?: string;
    maintenanceRecordId?: string;
    tireId?: string;
    customerId?: string;
    customerContractId?: string;
  },
): Promise<FinancialEntry[]> {
  let query = supabase
    .from('financial_entries')
    .select(FINANCIAL_LIST_COLUMNS)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('entry_date', {ascending: false})
    .limit(50);

  if (relation.vehicleId) query = query.eq('vehicle_id', relation.vehicleId);
  if (relation.driverId) query = query.eq('driver_id', relation.driverId);
  if (relation.tripId) query = query.eq('trip_id', relation.tripId);
  if (relation.fuelRecordId) query = query.eq('fuel_record_id', relation.fuelRecordId);
  if (relation.maintenanceRecordId) {
    query = query.eq('maintenance_record_id', relation.maintenanceRecordId);
  }
  if (relation.tireId) query = query.eq('tire_id', relation.tireId);
  if (relation.customerId) query = query.eq('customer_id', relation.customerId);
  if (relation.customerContractId) {
    query = query.eq('customer_contract_id', relation.customerContractId);
  }

  const {data, error} = await query;

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return (data ?? []).map((row) => mapFinancialEntryRow(row as unknown as FinancialEntryRow));
}

export async function getFinancialEntryById(
  supabase: SupabaseClient,
  companyId: string,
  entryId: string,
): Promise<FinancialEntry | null> {
  const {data, error} = await supabase
    .from('financial_entries')
    .select(FINANCIAL_DETAIL_COLUMNS)
    .eq('id', entryId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  if (!data) return null;
  return mapFinancialEntryRow(data as unknown as FinancialEntryRow);
}

export async function createFinancialEntry(
  supabase: SupabaseClient,
  companyId: string,
  input: CreateFinancialEntryInput,
  profileId: string,
  extra?: Record<string, unknown>,
): Promise<FinancialEntry> {
  const payload = {...buildEntryPayload(input, profileId, true), ...extra};

  const {data, error} = await supabase
    .from('financial_entries')
    .insert({...payload, company_id: companyId})
    .select(FINANCIAL_DETAIL_COLUMNS)
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapFinancialEntryRow(data as unknown as FinancialEntryRow);
}

export async function updateFinancialEntry(
  supabase: SupabaseClient,
  companyId: string,
  entryId: string,
  input: UpdateFinancialEntryInput,
  profileId: string,
): Promise<FinancialEntry> {
  const payload = buildEntryPayload(input, profileId, false);

  const {data, error} = await supabase
    .from('financial_entries')
    .update(payload)
    .eq('id', entryId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .select(FINANCIAL_DETAIL_COLUMNS)
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapFinancialEntryRow(data as unknown as FinancialEntryRow);
}

export async function markFinancialEntryPaid(
  supabase: SupabaseClient,
  companyId: string,
  entryId: string,
  profileId: string,
  options?: {paidAt?: string; paidAmount?: number},
): Promise<FinancialEntry> {
  const payload: Record<string, unknown> = {
    entry_status: 'paid',
    paid_at: options?.paidAt ?? new Date().toISOString(),
    updated_by: profileId,
  };

  if (options?.paidAmount != null) {
    payload.paid_amount = options.paidAmount;
  }

  const {data, error} = await supabase
    .from('financial_entries')
    .update(payload)
    .eq('id', entryId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .select(FINANCIAL_DETAIL_COLUMNS)
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapFinancialEntryRow(data as unknown as FinancialEntryRow);
}

export async function cancelFinancialEntry(
  supabase: SupabaseClient,
  companyId: string,
  entryId: string,
  profileId: string,
): Promise<FinancialEntry> {
  const entry = await getFinancialEntryById(supabase, companyId, entryId);
  if (!entry) {
    throw new Error('Lançamento não encontrado.');
  }

  if (entry.entryStatus === 'cancelled') {
    throw new Error('Lançamento já cancelado.');
  }

  if (entry.entryStatus === 'paid') {
    throw new Error('Não é possível cancelar um lançamento pago.');
  }

  const {data, error} = await supabase
    .from('financial_entries')
    .update({
      entry_status: 'cancelled',
      updated_by: profileId,
    })
    .eq('id', entryId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .select(FINANCIAL_DETAIL_COLUMNS)
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapFinancialEntryRow(data as unknown as FinancialEntryRow);
}

export async function reverseFinancialEntry(
  supabase: SupabaseClient,
  companyId: string,
  entryId: string,
  profileId: string,
  reason?: string | null,
): Promise<FinancialEntry> {
  const original = await getFinancialEntryById(supabase, companyId, entryId);
  if (!original) {
    throw new Error('Lançamento não encontrado.');
  }

  if (original.entryStatus === 'reversed') {
    throw new Error('Lançamento já estornado.');
  }

  const reversal = await createFinancialEntry(
    supabase,
    companyId,
    {
      branchId: original.branchId,
      vehicleId: original.vehicleId,
      driverId: original.driverId,
      tripId: original.tripId,
      categoryId: original.categoryId,
      costCenterId: original.costCenterId,
      entryType: 'reversal',
      entryStatus: 'paid',
      description: reason ?? `Estorno do lançamento ${original.referenceNumber ?? original.id}`,
      referenceNumber: original.referenceNumber,
      supplier: original.supplier,
      client: original.client,
      amount: original.amount,
      currency: original.currency,
      entryDate: new Date().toISOString().slice(0, 10),
      dueDate: null,
      notes: reason ?? null,
    },
    profileId,
    {
      reversed_entry_id: entryId,
      source_module: original.sourceModule,
      fuel_record_id: original.fuelRecordId,
      maintenance_record_id: original.maintenanceRecordId,
      tire_id: original.tireId,
      is_system_generated: true,
    },
  );

  await supabase
    .from('financial_entries')
    .update({
      entry_status: 'reversed',
      updated_by: profileId,
    })
    .eq('id', entryId)
    .eq('company_id', companyId);

  return reversal;
}

export async function softDeleteFinancialEntry(
  supabase: SupabaseClient,
  companyId: string,
  entryId: string,
  profileId: string,
): Promise<void> {
  const entry = await getFinancialEntryById(supabase, companyId, entryId);
  if (!entry) {
    throw new Error('Lançamento não encontrado.');
  }

  if (entry.isSystemGenerated) {
    await reverseFinancialEntry(supabase, companyId, entryId, profileId, 'Exclusão via soft delete');
    return;
  }

  const {error} = await supabase
    .from('financial_entries')
    .update({
      deleted_at: new Date().toISOString(),
      status: 'archived',
      updated_by: profileId,
    })
    .eq('id', entryId)
    .eq('company_id', companyId);

  if (error) {
    throw new Error(mapDatabaseError(error));
  }
}

export async function listFinancialHistory(
  supabase: SupabaseClient,
  companyId: string,
  entryId: string,
): Promise<FinancialHistory[]> {
  const {data, error} = await supabase
    .from('financial_history')
    .select('*')
    .eq('company_id', companyId)
    .eq('financial_entry_id', entryId)
    .order('created_at', {ascending: false});

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return (data ?? []).map(mapFinancialHistoryRow);
}

export async function listFinancialDocuments(
  supabase: SupabaseClient,
  companyId: string,
  entryId: string,
): Promise<FinancialDocument[]> {
  const {data, error} = await supabase
    .from('financial_documents')
    .select('*')
    .eq('company_id', companyId)
    .eq('financial_entry_id', entryId)
    .is('deleted_at', null)
    .order('created_at', {ascending: false});

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return (data ?? []).map(mapFinancialDocumentRow);
}

export async function createFinancialDocument(
  supabase: SupabaseClient,
  companyId: string,
  entryId: string,
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
    fuelRecordId?: string | null;
    maintenanceRecordId?: string | null;
    tireId?: string | null;
  },
  profileId: string,
): Promise<FinancialDocument> {
  const {data, error} = await supabase
    .from('financial_documents')
    .insert({
      company_id: companyId,
      financial_entry_id: entryId,
      branch_id: input.branchId,
      vehicle_id: input.vehicleId,
      driver_id: input.driverId,
      trip_id: input.tripId,
      fuel_record_id: input.fuelRecordId,
      maintenance_record_id: input.maintenanceRecordId,
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
    .select('*')
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapFinancialDocumentRow(data);
}

export async function softDeleteFinancialDocument(
  supabase: SupabaseClient,
  companyId: string,
  documentId: string,
  profileId: string,
): Promise<void> {
  const {data: document, error: fetchError} = await supabase
    .from('financial_documents')
    .select('storage_path')
    .eq('id', documentId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .maybeSingle();

  if (fetchError) {
    throw new Error(mapDatabaseError(fetchError));
  }

  const {error} = await supabase
    .from('financial_documents')
    .update({
      deleted_at: new Date().toISOString(),
      updated_by: profileId,
    })
    .eq('id', documentId)
    .eq('company_id', companyId);

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  const storagePath = document?.storage_path;
  if (storagePath) {
    await supabase.storage.from(FINANCIAL_STORAGE_BUCKET).remove([storagePath]);
  }
}

export async function getFinancialDetail(
  supabase: SupabaseClient,
  companyId: string,
  entryId: string,
): Promise<FinancialDetailData | null> {
  const entry = await getFinancialEntryById(supabase, companyId, entryId);
  if (!entry) return null;

  const [history, documents] = await Promise.all([
    listFinancialHistory(supabase, companyId, entryId),
    listFinancialDocuments(supabase, companyId, entryId),
  ]);

  let relatedEntries: FinancialEntry[] = [];
  if (entry.reversedEntryId) {
    const related = await getFinancialEntryById(supabase, companyId, entry.reversedEntryId);
    if (related) relatedEntries = [related];
  }

  return {entry, history, documents, relatedEntries};
}

export async function getFinancialStats(
  supabase: SupabaseClient,
  companyId: string,
): Promise<FinancialStats> {
  const {data, error} = await supabase.rpc('get_financial_stats', {
    p_company_id: companyId,
  });

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  const stats = (data ?? {}) as Record<string, unknown>;

  const mapArray = <T>(
    raw: unknown,
    mapper: (item: Record<string, unknown>) => T,
  ): T[] => {
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => mapper(item as Record<string, unknown>));
  };

  return {
    total: Number(stats.total ?? 0),
    revenue: Number(stats.revenue ?? 0),
    expenses: Number(stats.expenses ?? 0),
    balance: Number(stats.balance ?? 0),
    cashFlow: Number(stats.cash_flow ?? 0),
    operatingProfit: Number(stats.operating_profit ?? 0),
    marginPercent: Number(stats.margin_percent ?? 0),
    ebitda: Number(stats.ebitda ?? 0),
    fuelCost: Number(stats.fuel_cost ?? 0),
    maintenanceCost: Number(stats.maintenance_cost ?? 0),
    tireCost: Number(stats.tire_cost ?? 0),
    costPerKm: Number(stats.cost_per_km ?? 0),
    costPerVehicle: Number(stats.cost_per_vehicle ?? 0),
    costPerDriver: Number(stats.cost_per_driver ?? 0),
    costPerTrip: Number(stats.cost_per_trip ?? 0),
    topVehicles: mapArray(stats.top_vehicles, (row) => ({
      vehicleId: String(row.vehicle_id ?? ''),
      vehiclePlate: String(row.vehicle_plate ?? ''),
      totalCost: Number(row.total_cost ?? 0),
    })),
    topDrivers: mapArray(stats.top_drivers, (row) => ({
      driverId: String(row.driver_id ?? ''),
      driverName: String(row.driver_name ?? ''),
      totalCost: Number(row.total_cost ?? 0),
    })),
    topCategories: mapArray(stats.top_categories, (row) => ({
      categoryId: String(row.category_id ?? ''),
      categoryName: String(row.category_name ?? ''),
      totalAmount: Number(row.total_amount ?? 0),
    })),
    topCostCenters: mapArray(stats.top_cost_centers, (row) => ({
      costCenterId: String(row.cost_center_id ?? ''),
      costCenterName: String(row.cost_center_name ?? ''),
      totalAmount: Number(row.total_amount ?? 0),
    })),
    topTrips: mapArray(stats.top_trips, (row) => ({
      tripId: String(row.trip_id ?? ''),
      tripNumber: String(row.trip_number ?? ''),
      totalRevenue: Number(row.total_revenue ?? 0),
      totalExpense: Number(row.total_expense ?? 0),
      profit: Number(row.profit ?? 0),
    })),
  };
}

export {FINANCIAL_STORAGE_BUCKET};
