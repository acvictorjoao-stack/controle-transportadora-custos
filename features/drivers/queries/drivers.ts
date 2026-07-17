import type {SupabaseClient} from '@supabase/supabase-js';

import {mapDatabaseError} from '@/features/master/companies/utils/database-error';

import {
  DRIVER_DETAIL_COLUMNS,
  DRIVER_LIST_COLUMNS,
  DRIVER_STORAGE_BUCKET,
  DRIVERS_PAGE_SIZE,
} from '../constants';
import {
  mapDriverDocumentRow,
  mapDriverHistoryRow,
  mapDriverRow,
} from '../services/mappers';
import type {
  Driver,
  DriverBranchStats,
  DriverDocument,
  DriverHistory,
  DriverListFilters,
  DriverRow,
  DriverSelectOption,
  DriverSortOptions,
  DriverStats,
  PaginatedDrivers,
} from '../types';
import type {CreateDriverInput, UpdateDriverInput} from '../validation';

export interface ListDriversOptions {
  companyId: string;
  search?: string;
  page?: number;
  pageSize?: number;
  filters?: DriverListFilters;
  sort?: DriverSortOptions;
}

const SORT_COLUMNS: Record<NonNullable<DriverSortOptions['sortBy']>, string> = {
  name: 'name',
  cpf: 'cpf',
  cnh_number: 'cnh_number',
  license_expires_at: 'license_expires_at',
  operational_status: 'operational_status',
  created_at: 'created_at',
};

function sanitizeSearchTerm(value: string): string {
  return value.replace(/[%(),]/g, '').trim();
}

function buildDriverPayload(
  input: CreateDriverInput | UpdateDriverInput,
  profileId: string,
  isCreate: boolean,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: input.name,
    cpf: input.cpf,
    rg: input.rg,
    cnh_number: input.cnhNumber,
    license_category: input.licenseCategory,
    license_issued_at: input.licenseIssuedAt,
    license_expires_at: input.licenseExpiresAt,
    ear: input.ear ?? false,
    birth_date: input.birthDate,
    phone: input.phone,
    whatsapp: input.whatsapp,
    email: input.email,
    address: input.address,
    zip_code: input.zipCode,
    city: input.city,
    state: input.state,
    notes: input.notes,
    operational_status: input.operationalStatus ?? 'active',
    hired_at: input.hiredAt,
    terminated_at: input.terminatedAt,
    contract_type: input.contractType ?? null,
    emergency_contact: input.emergencyContact,
    branch_id: input.branchId,
    updated_by: profileId,
  };

  if (isCreate) {
    payload.created_by = profileId;
  }

  return payload;
}

export async function listDrivers(
  supabase: SupabaseClient,
  options: ListDriversOptions,
): Promise<PaginatedDrivers> {
  const search = sanitizeSearchTerm(options.search ?? '');
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? DRIVERS_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const filters = options.filters ?? {};
  const sortBy = options.sort?.sortBy ?? 'name';
  const sortOrder = options.sort?.sortOrder ?? 'asc';
  const ascending = sortOrder === 'asc';
  const sortColumn = SORT_COLUMNS[sortBy] ?? 'name';

  let query = supabase
    .from('drivers')
    .select(DRIVER_LIST_COLUMNS, {count: 'exact'})
    .eq('company_id', options.companyId)
    .is('deleted_at', null);

  if (filters.operationalStatus) {
    query = query.eq('operational_status', filters.operationalStatus);
  }
  if (filters.branchId) {
    query = query.eq('branch_id', filters.branchId);
  }
  if (filters.licenseCategory) {
    query = query.eq('license_category', filters.licenseCategory);
  }
  if (filters.contractType) {
    query = query.eq('contract_type', filters.contractType);
  }

  if (filters.cnhExpired) {
    const today = new Date().toISOString().slice(0, 10);
    query = query.not('license_expires_at', 'is', null).lt('license_expires_at', today);
  } else if (filters.cnhExpiring) {
    const today = new Date();
    const limit = new Date(today);
    limit.setDate(limit.getDate() + 30);
    query = query
      .gte('license_expires_at', today.toISOString().slice(0, 10))
      .lte('license_expires_at', limit.toISOString().slice(0, 10));
  }

  if (filters.earPending) {
    query = query.eq('ear', false).eq('operational_status', 'active');
  }

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,cpf.ilike.%${search}%,cnh_number.ilike.%${search}%,phone.ilike.%${search}%`,
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
    items: (data ?? []).map((row) => mapDriverRow(row as unknown as DriverRow)),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function listDriversForSelect(
  supabase: SupabaseClient,
  companyId: string,
  limit = 100,
): Promise<DriverSelectOption[]> {
  const {data, error} = await supabase
    .from('drivers')
    .select('id, name, phone, cnh_number, license_category, branches:branch_id (id, name)')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('name')
    .limit(limit);

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return (data ?? []).map((row) => {
    const branch = Array.isArray(row.branches) ? row.branches[0] : row.branches;
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      cnhNumber: row.cnh_number,
      licenseCategory: row.license_category,
      branchName: branch?.name ?? null,
    };
  });
}

export async function getDriverById(
  supabase: SupabaseClient,
  companyId: string,
  driverId: string,
): Promise<Driver | null> {
  const {data, error} = await supabase
    .from('drivers')
    .select(DRIVER_DETAIL_COLUMNS)
    .eq('id', driverId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  if (!data) return null;
  return mapDriverRow(data as unknown as DriverRow);
}

export async function createDriver(
  supabase: SupabaseClient,
  companyId: string,
  input: CreateDriverInput,
  profileId: string,
): Promise<Driver> {
  const payload = buildDriverPayload(input, profileId, true);

  const {data, error} = await supabase
    .from('drivers')
    .insert({...payload, company_id: companyId})
    .select(DRIVER_DETAIL_COLUMNS)
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapDriverRow(data as unknown as DriverRow);
}

export async function updateDriver(
  supabase: SupabaseClient,
  companyId: string,
  driverId: string,
  input: UpdateDriverInput,
  profileId: string,
): Promise<Driver> {
  const payload = buildDriverPayload(input, profileId, false);

  const {data, error} = await supabase
    .from('drivers')
    .update(payload)
    .eq('id', driverId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .select(DRIVER_DETAIL_COLUMNS)
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapDriverRow(data as unknown as DriverRow);
}

export async function softDeleteDriver(
  supabase: SupabaseClient,
  companyId: string,
  driverId: string,
  profileId: string,
): Promise<void> {
  const {error} = await supabase
    .from('drivers')
    .update({
      deleted_at: new Date().toISOString(),
      status: 'archived',
      updated_by: profileId,
    })
    .eq('id', driverId)
    .eq('company_id', companyId);

  if (error) {
    throw new Error(mapDatabaseError(error));
  }
}

export async function updateDriverOperationalStatus(
  supabase: SupabaseClient,
  companyId: string,
  driverId: string,
  operationalStatus: Driver['operationalStatus'],
  profileId: string,
): Promise<Driver> {
  const {data, error} = await supabase
    .from('drivers')
    .update({operational_status: operationalStatus, updated_by: profileId})
    .eq('id', driverId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .select(DRIVER_DETAIL_COLUMNS)
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapDriverRow(data as unknown as DriverRow);
}

export async function updateDriverPhotoUrl(
  supabase: SupabaseClient,
  companyId: string,
  driverId: string,
  fileUrl: string | null,
  profileId: string,
  storagePath?: string | null,
): Promise<Driver> {
  const {data, error} = await supabase
    .from('drivers')
    .update({
      photo_url: fileUrl,
      photo_storage_path: storagePath ?? null,
      updated_by: profileId,
    })
    .eq('id', driverId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .select(DRIVER_DETAIL_COLUMNS)
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapDriverRow(data as unknown as DriverRow);
}

export async function getDriverStats(
  supabase: SupabaseClient,
  companyId: string,
): Promise<DriverStats> {
  const {data, error} = await supabase.rpc('get_driver_stats', {
    p_company_id: companyId,
  });

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  const stats = (data ?? {}) as Record<string, unknown>;
  const byBranchRaw = Array.isArray(stats.by_branch) ? stats.by_branch : [];

  const byBranch: DriverBranchStats[] = byBranchRaw.map((item) => {
    const row = item as Record<string, unknown>;
    return {
      branchId: typeof row.branch_id === 'string' ? row.branch_id : null,
      branchName: String(row.branch_name ?? 'Sem filial'),
      total: Number(row.total ?? 0),
      active: Number(row.active ?? 0),
    };
  });

  return {
    total: Number(stats.total ?? 0),
    active: Number(stats.active ?? 0),
    inactive: Number(stats.inactive ?? 0),
    cnhExpiring: Number(stats.cnh_expiring ?? 0),
    cnhExpired: Number(stats.cnh_expired ?? 0),
    earPending: Number(stats.ear_pending ?? 0),
    byBranch,
  };
}

export async function listDriverHistory(
  supabase: SupabaseClient,
  companyId: string,
  driverId: string,
): Promise<DriverHistory[]> {
  const {data, error} = await supabase
    .from('driver_history')
    .select('*')
    .eq('company_id', companyId)
    .eq('driver_id', driverId)
    .order('created_at', {ascending: false});

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return (data ?? []).map((row) =>
    mapDriverHistoryRow(row as Parameters<typeof mapDriverHistoryRow>[0]),
  );
}

export async function listDriverDocuments(
  supabase: SupabaseClient,
  companyId: string,
  driverId: string,
): Promise<DriverDocument[]> {
  const {data, error} = await supabase
    .from('driver_documents')
    .select('*')
    .eq('company_id', companyId)
    .eq('driver_id', driverId)
    .is('deleted_at', null)
    .order('created_at', {ascending: false});

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return (data ?? []).map((row) =>
    mapDriverDocumentRow(row as Parameters<typeof mapDriverDocumentRow>[0]),
  );
}

export async function createDriverDocument(
  supabase: SupabaseClient,
  companyId: string,
  driverId: string,
  input: {
    name: string;
    fileUrl: string;
    storagePath: string;
    documentType: string;
    mimeType?: string | null;
    fileSize?: number | null;
  },
  profileId: string,
): Promise<DriverDocument> {
  const {data, error} = await supabase
    .from('driver_documents')
    .insert({
      company_id: companyId,
      driver_id: driverId,
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

  return mapDriverDocumentRow(
    data as Parameters<typeof mapDriverDocumentRow>[0],
  );
}

export async function softDeleteDriverDocument(
  supabase: SupabaseClient,
  companyId: string,
  documentId: string,
): Promise<void> {
  const {data: document, error: fetchError} = await supabase
    .from('driver_documents')
    .select('storage_path')
    .eq('id', documentId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .maybeSingle();

  if (fetchError) {
    throw new Error(mapDatabaseError(fetchError));
  }

  const {error} = await supabase
    .from('driver_documents')
    .update({deleted_at: new Date().toISOString()})
    .eq('id', documentId)
    .eq('company_id', companyId);

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  const storagePath = document?.storage_path;
  if (storagePath) {
    await supabase.storage.from(DRIVER_STORAGE_BUCKET).remove([storagePath]);
  }
}
