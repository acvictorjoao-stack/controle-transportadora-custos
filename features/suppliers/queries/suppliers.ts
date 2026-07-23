import type {SupabaseClient} from '@supabase/supabase-js';

import {mapDatabaseError} from '@/features/master/companies/utils/database-error';

import {
  SUPPLIER_DETAIL_COLUMNS,
  SUPPLIER_LIST_COLUMNS,
  SUPPLIER_SELECT_COLUMNS,
  SUPPLIERS_PAGE_SIZE,
} from '../constants';
import {
  emptySupplierStats,
  mapSupplierRow,
  mapSupplierStats,
  mapSupplierToSelectOption,
} from '../services/mappers';
import type {
  PaginatedSuppliers,
  Supplier,
  SupplierFinancialSnippet,
  SupplierListFilters,
  SupplierRow,
  SupplierSelectOption,
  SupplierSortOptions,
  SupplierStats,
} from '../types';
import type {CreateSupplierInput, UpdateSupplierInput} from '../validation';

export interface ListSuppliersOptions {
  companyId: string;
  search?: string;
  page?: number;
  pageSize?: number;
  filters?: SupplierListFilters;
  sort?: SupplierSortOptions;
}

const SORT_COLUMNS: Record<NonNullable<SupplierSortOptions['sortBy']>, string> = {
  corporate_name: 'corporate_name',
  trade_name: 'trade_name',
  city: 'city',
  created_at: 'created_at',
  active: 'active',
};

function sanitizeSearchTerm(value: string): string {
  return value.replace(/[%(),]/g, '').trim();
}

function buildSupplierPayload(
  input: CreateSupplierInput | UpdateSupplierInput,
  profileId: string,
  isCreate: boolean,
): Record<string, unknown> {
  let documentType = input.documentType ?? null;
  if (input.document && !documentType) {
    if (input.document.length === 14) documentType = 'cnpj';
    else if (input.document.length === 11) documentType = 'cpf';
  }

  const payload: Record<string, unknown> = {
    corporate_name: input.corporateName,
    trade_name: input.tradeName,
    document: input.document,
    document_type: documentType,
    categories: input.categories,
    phone: input.phone,
    email: input.email,
    contact_name: input.contactName,
    zip_code: input.zipCode,
    address: input.address,
    number: input.number,
    district: input.district,
    city: input.city,
    state: input.state,
    active: input.active ?? true,
    notes: input.notes,
    updated_by: profileId,
  };

  if (isCreate) {
    payload.created_by = profileId;
  }

  return payload;
}

export async function listSuppliers(
  supabase: SupabaseClient,
  options: ListSuppliersOptions,
): Promise<PaginatedSuppliers> {
  const search = sanitizeSearchTerm(options.search ?? '');
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? SUPPLIERS_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const filters = options.filters ?? {};
  const sortBy = options.sort?.sortBy ?? 'corporate_name';
  const sortOrder = options.sort?.sortOrder ?? 'asc';
  const ascending = sortOrder === 'asc';
  const sortColumn = SORT_COLUMNS[sortBy] ?? 'corporate_name';

  let query = supabase
    .from('suppliers')
    .select(SUPPLIER_LIST_COLUMNS, {count: 'exact'})
    .eq('company_id', options.companyId)
    .is('deleted_at', null);

  if (filters.category) {
    query = query.contains('categories', [filters.category]);
  }
  if (filters.city) {
    query = query.ilike('city', filters.city);
  }
  if (filters.state) {
    query = query.ilike('state', filters.state);
  }
  if (typeof filters.active === 'boolean') {
    query = query.eq('active', filters.active);
  }

  if (search) {
    query = query.or(
      [
        `corporate_name.ilike.%${search}%`,
        `trade_name.ilike.%${search}%`,
        `document.ilike.%${search}%`,
        `contact_name.ilike.%${search}%`,
        `email.ilike.%${search}%`,
        `phone.ilike.%${search}%`,
        `city.ilike.%${search}%`,
      ].join(','),
    );
  }

  const {data, error, count} = await query
    .order(sortColumn, {ascending, nullsFirst: false})
    .range(from, to);

  if (error) throw new Error(mapDatabaseError(error));

  const items = (data as SupplierRow[]).map(mapSupplierRow);
  const total = count ?? 0;

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getSupplierById(
  supabase: SupabaseClient,
  companyId: string,
  supplierId: string,
): Promise<Supplier | null> {
  const {data, error} = await supabase
    .from('suppliers')
    .select(SUPPLIER_DETAIL_COLUMNS)
    .eq('company_id', companyId)
    .eq('id', supplierId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw new Error(mapDatabaseError(error));
  if (!data) return null;
  return mapSupplierRow(data as SupplierRow);
}

export async function createSupplier(
  supabase: SupabaseClient,
  companyId: string,
  input: CreateSupplierInput,
  profileId: string,
): Promise<Supplier> {
  const payload = {
    company_id: companyId,
    ...buildSupplierPayload(input, profileId, true),
  };

  const {data, error} = await supabase
    .from('suppliers')
    .insert(payload)
    .select(SUPPLIER_DETAIL_COLUMNS)
    .single();

  if (error) throw new Error(mapDatabaseError(error));
  return mapSupplierRow(data as SupplierRow);
}

export async function updateSupplier(
  supabase: SupabaseClient,
  companyId: string,
  supplierId: string,
  input: UpdateSupplierInput,
  profileId: string,
): Promise<Supplier> {
  const {data, error} = await supabase
    .from('suppliers')
    .update(buildSupplierPayload(input, profileId, false))
    .eq('company_id', companyId)
    .eq('id', supplierId)
    .is('deleted_at', null)
    .select(SUPPLIER_DETAIL_COLUMNS)
    .single();

  if (error) throw new Error(mapDatabaseError(error));
  return mapSupplierRow(data as SupplierRow);
}

export async function updateSupplierActive(
  supabase: SupabaseClient,
  companyId: string,
  supplierId: string,
  active: boolean,
  profileId: string,
): Promise<Supplier> {
  const {data, error} = await supabase
    .from('suppliers')
    .update({active, updated_by: profileId})
    .eq('company_id', companyId)
    .eq('id', supplierId)
    .is('deleted_at', null)
    .select(SUPPLIER_DETAIL_COLUMNS)
    .single();

  if (error) throw new Error(mapDatabaseError(error));
  return mapSupplierRow(data as SupplierRow);
}

async function supplierHasLinks(
  supabase: SupabaseClient,
  companyId: string,
  supplierId: string,
): Promise<boolean> {
  const checks = await Promise.all([
    supabase
      .from('financial_entries')
      .select('id', {count: 'exact', head: true})
      .eq('company_id', companyId)
      .eq('supplier_id', supplierId)
      .is('deleted_at', null),
    supabase
      .from('maintenance_records')
      .select('id', {count: 'exact', head: true})
      .eq('company_id', companyId)
      .eq('supplier_id', supplierId)
      .is('deleted_at', null),
    supabase
      .from('tires')
      .select('id', {count: 'exact', head: true})
      .eq('company_id', companyId)
      .eq('supplier_id', supplierId)
      .is('deleted_at', null),
    supabase
      .from('tire_recaps')
      .select('id', {count: 'exact', head: true})
      .eq('company_id', companyId)
      .eq('supplier_id', supplierId)
      .is('deleted_at', null),
    supabase
      .from('fuel_records')
      .select('id', {count: 'exact', head: true})
      .eq('company_id', companyId)
      .eq('supplier_id', supplierId)
      .is('deleted_at', null),
  ]);

  for (const result of checks) {
    if (result.error) throw new Error(mapDatabaseError(result.error));
    if ((result.count ?? 0) > 0) return true;
  }
  return false;
}

/**
 * Soft-delete apenas se não houver vínculo.
 * Caso exista vínculo, o chamador deve inativar.
 */
export async function softDeleteSupplier(
  supabase: SupabaseClient,
  companyId: string,
  supplierId: string,
  profileId: string,
): Promise<void> {
  const linked = await supplierHasLinks(supabase, companyId, supplierId);
  if (linked) {
    throw new Error(
      'Este fornecedor possui vínculos e não pode ser excluído. Inative-o em vez disso.',
    );
  }

  const {error} = await supabase
    .from('suppliers')
    .update({deleted_at: new Date().toISOString(), updated_by: profileId, active: false})
    .eq('company_id', companyId)
    .eq('id', supplierId)
    .is('deleted_at', null);

  if (error) throw new Error(mapDatabaseError(error));
}

export async function listSuppliersForSelect(
  supabase: SupabaseClient,
  companyId: string,
  options?: {includeInactive?: boolean; search?: string; limit?: number},
): Promise<SupplierSelectOption[]> {
  const search = sanitizeSearchTerm(options?.search ?? '');
  const limit = options?.limit ?? 200;

  let query = supabase
    .from('suppliers')
    .select(SUPPLIER_SELECT_COLUMNS)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('corporate_name')
    .limit(limit);

  if (!options?.includeInactive) {
    query = query.eq('active', true);
  }

  if (search) {
    query = query.or(
      [
        `corporate_name.ilike.%${search}%`,
        `trade_name.ilike.%${search}%`,
        `document.ilike.%${search}%`,
        `city.ilike.%${search}%`,
      ].join(','),
    );
  }

  const {data, error} = await query;
  if (error) throw new Error(mapDatabaseError(error));
  return (data as SupplierRow[]).map((row) => mapSupplierToSelectOption(mapSupplierRow(row)));
}

export async function getSupplierStats(
  supabase: SupabaseClient,
  companyId: string,
  supplierId: string,
): Promise<SupplierStats> {
  const {data, error} = await supabase.rpc('get_supplier_stats', {
    p_company_id: companyId,
    p_supplier_id: supplierId,
  });

  if (error) {
    console.error('get_supplier_stats failed:', error);
    return emptySupplierStats();
  }

  return mapSupplierStats(data as Record<string, unknown>);
}

export async function listSupplierRecentFinancial(
  supabase: SupabaseClient,
  companyId: string,
  supplierId: string,
  limit = 10,
): Promise<SupplierFinancialSnippet[]> {
  const {data, error} = await supabase
    .from('financial_entries')
    .select('id, description, amount, entry_date, entry_status, source_module')
    .eq('company_id', companyId)
    .eq('supplier_id', supplierId)
    .is('deleted_at', null)
    .order('entry_date', {ascending: false})
    .limit(limit);

  if (error) throw new Error(mapDatabaseError(error));

  return (data ?? []).map((row) => ({
    id: String(row.id),
    description: row.description ? String(row.description) : null,
    amount: Number(row.amount ?? 0),
    entryDate: String(row.entry_date),
    entryStatus: String(row.entry_status),
    sourceModule: row.source_module ? String(row.source_module) : null,
  }));
}
