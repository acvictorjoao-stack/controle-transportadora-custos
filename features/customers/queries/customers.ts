import type {SupabaseClient} from '@supabase/supabase-js';

import {mapDatabaseError} from '@/features/master/companies/utils/database-error';

import {
  CUSTOMER_DETAIL_COLUMNS,
  CUSTOMER_LIST_COLUMNS,
  CUSTOMERS_PAGE_SIZE,
  CUSTOMER_STORAGE_BUCKET,
} from '../constants';
import {
  mapCustomerAddressRow,
  mapCustomerContactRow,
  mapCustomerContractItemRow,
  mapCustomerContractRow,
  mapCustomerDocumentRow,
  mapCustomerHistoryRow,
  mapCustomerRow,
} from '../services/mappers';
import type {
  Customer,
  CustomerAddress,
  CustomerAddressRow,
  CustomerContact,
  CustomerContactRow,
  CustomerContract,
  CustomerContractItem,
  CustomerContractItemRow,
  CustomerContractRow,
  CustomerDocument,
  CustomerDocumentRow,
  CustomerHistory,
  CustomerHistoryRow,
  CustomerListFilters,
  CustomerRow,
  CustomerSortOptions,
  CustomerStats,
  PaginatedCustomers,
} from '../types/customer';
import type {
  CreateCustomerInput,
  CustomerAddressInput,
  CustomerContactInput,
  UpdateCustomerInput,
} from '../validation';

export interface ListCustomersOptions {
  companyId: string;
  search?: string;
  page?: number;
  pageSize?: number;
  filters?: CustomerListFilters;
  sort?: CustomerSortOptions;
}

const SORT_COLUMNS: Record<NonNullable<CustomerSortOptions['sortBy']>, string> = {
  legal_name: 'legal_name',
  trade_name: 'trade_name',
  tax_id: 'tax_id',
  customer_status: 'customer_status',
  segment: 'segment',
  created_at: 'created_at',
};

function sanitizeSearchTerm(value: string): string {
  return value.replace(/[%(),]/g, '').trim();
}

async function resolveFilteredCustomerIds(
  supabase: SupabaseClient,
  companyId: string,
  filters: CustomerListFilters,
): Promise<string[] | null> {
  if (!filters.city && !filters.state && !filters.hasActiveContract) {
    return null;
  }

  const matchingSets: Set<string>[] = [];

  if (filters.city || filters.state) {
    const {data, error} = await supabase
      .from('customer_addresses')
      .select('customer_id, city, state, is_primary')
      .eq('company_id', companyId)
      .is('deleted_at', null);

    if (error) {
      throw new Error(mapDatabaseError(error));
    }

    const addressMap = new Map<string, {city: string | null; state: string | null}>();
    for (const row of data ?? []) {
      const addr = row as {
        customer_id: string;
        city: string | null;
        state: string | null;
        is_primary: boolean;
      };
      if (!addressMap.has(addr.customer_id) || addr.is_primary) {
        addressMap.set(addr.customer_id, {city: addr.city, state: addr.state});
      }
    }

    const matched = new Set<string>();
    for (const [customerId, addr] of addressMap) {
      if (filters.city && addr.city?.toLowerCase() !== filters.city.toLowerCase()) {
        continue;
      }
      if (filters.state && addr.state?.toLowerCase() !== filters.state.toLowerCase()) {
        continue;
      }
      matched.add(customerId);
    }
    matchingSets.push(matched);
  }

  if (filters.hasActiveContract) {
    const {data, error} = await supabase
      .from('customer_contracts')
      .select('customer_id')
      .eq('company_id', companyId)
      .eq('contract_status', 'active')
      .is('deleted_at', null);

    if (error) {
      throw new Error(mapDatabaseError(error));
    }

    matchingSets.push(
      new Set((data ?? []).map((row) => (row as {customer_id: string}).customer_id)),
    );
  }

  if (matchingSets.length === 0) {
    return null;
  }

  let result = matchingSets[0];
  for (let index = 1; index < matchingSets.length; index += 1) {
    result = new Set([...result].filter((id) => matchingSets[index].has(id)));
  }

  return [...result];
}

function buildCustomerPayload(
  input: CreateCustomerInput | UpdateCustomerInput,
  profileId: string,
  isCreate: boolean,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    legal_name: input.legalName,
    trade_name: input.tradeName,
    tax_id: input.taxId,
    state_registration: input.stateRegistration,
    municipal_registration: input.municipalRegistration,
    email: input.email,
    phone: input.phone,
    whatsapp: input.whatsapp,
    website: input.website,
    customer_status: input.customerStatus ?? 'active',
    segment: input.segment ?? null,
    notes: input.notes,
    sales_representative: input.salesRepresentative,
    credit_limit: input.creditLimit,
    payment_term_days: input.paymentTermDays,
    branch_id: input.branchId,
    updated_by: profileId,
  };

  if (isCreate) {
    payload.created_by = profileId;
  }

  return payload;
}

export async function listCustomers(
  supabase: SupabaseClient,
  options: ListCustomersOptions,
): Promise<PaginatedCustomers> {
  const search = sanitizeSearchTerm(options.search ?? '');
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? CUSTOMERS_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const filters = options.filters ?? {};
  const sortBy = options.sort?.sortBy ?? 'legal_name';
  const sortOrder = options.sort?.sortOrder ?? 'asc';
  const ascending = sortOrder === 'asc';
  const sortColumn = SORT_COLUMNS[sortBy] ?? 'legal_name';

  const filteredCustomerIds = await resolveFilteredCustomerIds(
    supabase,
    options.companyId,
    filters,
  );

  if (filteredCustomerIds !== null && filteredCustomerIds.length === 0) {
    return {items: [], total: 0, page, pageSize, totalPages: 1};
  }

  let query = supabase
    .from('customers')
    .select(CUSTOMER_LIST_COLUMNS, {count: 'exact'})
    .eq('company_id', options.companyId)
    .is('deleted_at', null);

  if (filteredCustomerIds !== null) {
    query = query.in('id', filteredCustomerIds);
  }

  if (filters.customerStatus) {
    query = query.eq('customer_status', filters.customerStatus);
  }
  if (filters.segment) {
    query = query.eq('segment', filters.segment);
  }
  if (filters.salesRepresentative) {
    query = query.ilike('sales_representative', `%${filters.salesRepresentative}%`);
  }
  if (filters.branchId) {
    query = query.eq('branch_id', filters.branchId);
  }

  if (search) {
    query = query.or(
      `legal_name.ilike.%${search}%,trade_name.ilike.%${search}%,tax_id.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`,
    );
  }

  const {data, error, count} = await query
    .order(sortColumn, {ascending, nullsFirst: false})
    .range(from, to);

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  const items = (data as CustomerRow[]).map(mapCustomerRow);
  const total = count ?? 0;

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getCustomerById(
  supabase: SupabaseClient,
  companyId: string,
  customerId: string,
): Promise<Customer | null> {
  const {data, error} = await supabase
    .from('customers')
    .select(CUSTOMER_DETAIL_COLUMNS)
    .eq('company_id', companyId)
    .eq('id', customerId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw new Error(mapDatabaseError(error));
  if (!data) return null;
  return mapCustomerRow(data as CustomerRow);
}

export async function createCustomer(
  supabase: SupabaseClient,
  companyId: string,
  input: CreateCustomerInput,
  profileId: string,
): Promise<Customer> {
  const payload = {
    company_id: companyId,
    ...buildCustomerPayload(input, profileId, true),
  };

  const {data, error} = await supabase
    .from('customers')
    .insert(payload)
    .select(CUSTOMER_DETAIL_COLUMNS)
    .single();

  if (error) throw new Error(mapDatabaseError(error));
  return mapCustomerRow(data as CustomerRow);
}

export async function updateCustomer(
  supabase: SupabaseClient,
  companyId: string,
  customerId: string,
  input: UpdateCustomerInput,
  profileId: string,
): Promise<Customer> {
  const {data, error} = await supabase
    .from('customers')
    .update(buildCustomerPayload(input, profileId, false))
    .eq('company_id', companyId)
    .eq('id', customerId)
    .is('deleted_at', null)
    .select(CUSTOMER_DETAIL_COLUMNS)
    .single();

  if (error) throw new Error(mapDatabaseError(error));
  return mapCustomerRow(data as CustomerRow);
}

export async function updateCustomerStatus(
  supabase: SupabaseClient,
  companyId: string,
  customerId: string,
  customerStatus: CreateCustomerInput['customerStatus'],
  profileId: string,
): Promise<Customer> {
  const {data, error} = await supabase
    .from('customers')
    .update({customer_status: customerStatus, updated_by: profileId})
    .eq('company_id', companyId)
    .eq('id', customerId)
    .is('deleted_at', null)
    .select(CUSTOMER_DETAIL_COLUMNS)
    .single();

  if (error) throw new Error(mapDatabaseError(error));
  return mapCustomerRow(data as CustomerRow);
}

export async function softDeleteCustomer(
  supabase: SupabaseClient,
  companyId: string,
  customerId: string,
  profileId: string,
): Promise<void> {
  const {error} = await supabase
    .from('customers')
    .update({deleted_at: new Date().toISOString(), updated_by: profileId})
    .eq('company_id', companyId)
    .eq('id', customerId)
    .is('deleted_at', null);

  if (error) throw new Error(mapDatabaseError(error));
}

export async function listCustomerAddresses(
  supabase: SupabaseClient,
  companyId: string,
  customerId: string,
): Promise<CustomerAddress[]> {
  const {data, error} = await supabase
    .from('customer_addresses')
    .select('*')
    .eq('company_id', companyId)
    .eq('customer_id', customerId)
    .is('deleted_at', null)
    .order('is_primary', {ascending: false});

  if (error) throw new Error(mapDatabaseError(error));
  return (data as CustomerAddressRow[]).map(mapCustomerAddressRow);
}

export async function createCustomerAddress(
  supabase: SupabaseClient,
  companyId: string,
  customerId: string,
  input: CustomerAddressInput,
  profileId: string,
): Promise<CustomerAddress> {
  const {data, error} = await supabase
    .from('customer_addresses')
    .insert({
      company_id: companyId,
      customer_id: customerId,
      address_type: input.addressType,
      label: input.label,
      street: input.street,
      number: input.number,
      complement: input.complement,
      neighborhood: input.neighborhood,
      city: input.city,
      state: input.state,
      zip_code: input.zipCode,
      country: input.country ?? 'BR',
      is_primary: input.isPrimary ?? false,
      created_by: profileId,
      updated_by: profileId,
    })
    .select('*')
    .single();

  if (error) throw new Error(mapDatabaseError(error));
  return mapCustomerAddressRow(data as CustomerAddressRow);
}

export async function softDeleteCustomerAddress(
  supabase: SupabaseClient,
  companyId: string,
  addressId: string,
  profileId: string,
): Promise<void> {
  const {error} = await supabase
    .from('customer_addresses')
    .update({deleted_at: new Date().toISOString(), updated_by: profileId})
    .eq('company_id', companyId)
    .eq('id', addressId)
    .is('deleted_at', null);

  if (error) throw new Error(mapDatabaseError(error));
}

export async function listCustomerContacts(
  supabase: SupabaseClient,
  companyId: string,
  customerId: string,
): Promise<CustomerContact[]> {
  const {data, error} = await supabase
    .from('customer_contacts')
    .select('*')
    .eq('company_id', companyId)
    .eq('customer_id', customerId)
    .is('deleted_at', null)
    .order('is_primary', {ascending: false});

  if (error) throw new Error(mapDatabaseError(error));
  return (data as CustomerContactRow[]).map(mapCustomerContactRow);
}

export async function createCustomerContact(
  supabase: SupabaseClient,
  companyId: string,
  customerId: string,
  input: CustomerContactInput,
  profileId: string,
): Promise<CustomerContact> {
  const {data, error} = await supabase
    .from('customer_contacts')
    .insert({
      company_id: companyId,
      customer_id: customerId,
      name: input.name,
      job_title: input.jobTitle,
      phone: input.phone,
      whatsapp: input.whatsapp,
      email: input.email,
      is_primary: input.isPrimary ?? false,
      created_by: profileId,
      updated_by: profileId,
    })
    .select('*')
    .single();

  if (error) throw new Error(mapDatabaseError(error));
  return mapCustomerContactRow(data as CustomerContactRow);
}

export async function softDeleteCustomerContact(
  supabase: SupabaseClient,
  companyId: string,
  contactId: string,
  profileId: string,
): Promise<void> {
  const {error} = await supabase
    .from('customer_contacts')
    .update({deleted_at: new Date().toISOString(), updated_by: profileId})
    .eq('company_id', companyId)
    .eq('id', contactId)
    .is('deleted_at', null);

  if (error) throw new Error(mapDatabaseError(error));
}

export async function listCustomerContracts(
  supabase: SupabaseClient,
  companyId: string,
  customerId: string,
): Promise<CustomerContract[]> {
  const {data, error} = await supabase
    .from('customer_contracts')
    .select('*')
    .eq('company_id', companyId)
    .eq('customer_id', customerId)
    .is('deleted_at', null)
    .order('created_at', {ascending: false});

  if (error) throw new Error(mapDatabaseError(error));

  const contracts = (data as CustomerContractRow[]).map(mapCustomerContractRow);
  if (contracts.length === 0) return contracts;

  const contractIds = contracts.map((c) => c.id);
  const {data: items, error: itemsError} = await supabase
    .from('customer_contract_items')
    .select('*')
    .eq('company_id', companyId)
    .in('contract_id', contractIds)
    .is('deleted_at', null);

  if (itemsError) throw new Error(mapDatabaseError(itemsError));

  const itemsByContract = new Map<string, CustomerContractItem[]>();
  for (const row of (items ?? []) as CustomerContractItemRow[]) {
    const mapped = mapCustomerContractItemRow(row);
    const list = itemsByContract.get(row.contract_id) ?? [];
    list.push(mapped);
    itemsByContract.set(row.contract_id, list);
  }

  return contracts.map((contract) => ({
    ...contract,
    items: itemsByContract.get(contract.id) ?? [],
  }));
}

export async function listActiveContractsForSelect(
  supabase: SupabaseClient,
  companyId: string,
  customerId?: string,
): Promise<CustomerContract[]> {
  let query = supabase
    .from('customer_contracts')
    .select('*')
    .eq('company_id', companyId)
    .eq('contract_status', 'active')
    .is('deleted_at', null)
    .order('contract_number');

  if (customerId) {
    query = query.eq('customer_id', customerId);
  }

  const {data, error} = await query;
  if (error) throw new Error(mapDatabaseError(error));
  return (data as CustomerContractRow[]).map(mapCustomerContractRow);
}

export async function getContractById(
  supabase: SupabaseClient,
  companyId: string,
  contractId: string,
): Promise<CustomerContract | null> {
  const {data, error} = await supabase
    .from('customer_contracts')
    .select('*')
    .eq('company_id', companyId)
    .eq('id', contractId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw new Error(mapDatabaseError(error));
  if (!data) return null;

  const contract = mapCustomerContractRow(data as CustomerContractRow);
  const {data: items, error: itemsError} = await supabase
    .from('customer_contract_items')
    .select('*')
    .eq('company_id', companyId)
    .eq('contract_id', contractId)
    .is('deleted_at', null);

  if (itemsError) throw new Error(mapDatabaseError(itemsError));
  contract.items = (items as CustomerContractItemRow[]).map(mapCustomerContractItemRow);
  return contract;
}

export async function listCustomerDocuments(
  supabase: SupabaseClient,
  companyId: string,
  customerId: string,
): Promise<CustomerDocument[]> {
  const {data, error} = await supabase
    .from('customer_documents')
    .select('*')
    .eq('company_id', companyId)
    .eq('customer_id', customerId)
    .is('deleted_at', null)
    .order('created_at', {ascending: false});

  if (error) throw new Error(mapDatabaseError(error));
  return (data as CustomerDocumentRow[]).map(mapCustomerDocumentRow);
}

export async function createCustomerDocument(
  supabase: SupabaseClient,
  companyId: string,
  customerId: string,
  input: {
    contractId?: string | null;
    name: string;
    fileUrl: string;
    storagePath: string;
    documentType: string;
    mimeType?: string | null;
    fileSize?: number | null;
  },
  profileId: string,
): Promise<CustomerDocument> {
  const {data, error} = await supabase
    .from('customer_documents')
    .insert({
      company_id: companyId,
      customer_id: customerId,
      contract_id: input.contractId ?? null,
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

  if (error) throw new Error(mapDatabaseError(error));
  return mapCustomerDocumentRow(data as CustomerDocumentRow);
}

export async function softDeleteCustomerDocument(
  supabase: SupabaseClient,
  companyId: string,
  documentId: string,
  profileId: string,
): Promise<void> {
  const {data: document, error: fetchError} = await supabase
    .from('customer_documents')
    .select('storage_path')
    .eq('company_id', companyId)
    .eq('id', documentId)
    .is('deleted_at', null)
    .maybeSingle();

  if (fetchError) throw new Error(mapDatabaseError(fetchError));

  const {error} = await supabase
    .from('customer_documents')
    .update({deleted_at: new Date().toISOString(), updated_by: profileId})
    .eq('company_id', companyId)
    .eq('id', documentId)
    .is('deleted_at', null);

  if (error) throw new Error(mapDatabaseError(error));

  const storagePath = document?.storage_path;
  if (storagePath) {
    await supabase.storage.from(CUSTOMER_STORAGE_BUCKET).remove([storagePath]);
  }
}

export async function listCustomerHistory(
  supabase: SupabaseClient,
  companyId: string,
  customerId: string,
): Promise<CustomerHistory[]> {
  const {data, error} = await supabase
    .from('customer_history')
    .select('*')
    .eq('company_id', companyId)
    .eq('customer_id', customerId)
    .order('created_at', {ascending: false})
    .limit(100);

  if (error) throw new Error(mapDatabaseError(error));
  return (data as CustomerHistoryRow[]).map(mapCustomerHistoryRow);
}

export async function getCustomerStats(
  supabase: SupabaseClient,
  companyId: string,
): Promise<CustomerStats> {
  const {data, error} = await supabase.rpc('get_customer_stats', {
    p_company_id: companyId,
  });

  if (error) throw new Error(mapDatabaseError(error));

  const stats = data as Record<string, unknown>;
  return {
    total: Number(stats.total ?? 0),
    active: Number(stats.active ?? 0),
    inactive: Number(stats.inactive ?? 0),
    activeContracts: Number(stats.active_contracts ?? 0),
    expiringContracts: Number(stats.expiring_contracts ?? 0),
    expiredContracts: Number(stats.expired_contracts ?? 0),
    contractedRevenue: Number(stats.contracted_revenue ?? 0),
    topCustomers: Array.isArray(stats.top_customers)
      ? (stats.top_customers as Array<Record<string, unknown>>).map((row) => ({
          customerId: String(row.customer_id ?? ''),
          customerName: String(row.customer_name ?? ''),
          totalRevenue: Number(row.total_revenue ?? 0),
          contractCount: Number(row.contract_count ?? 0),
        }))
      : [],
    topContracts: Array.isArray(stats.top_contracts)
      ? (stats.top_contracts as Array<Record<string, unknown>>).map((row) => ({
          contractId: String(row.contract_id ?? ''),
          contractNumber: String(row.contract_number ?? ''),
          customerId: String(row.customer_id ?? ''),
          customerName: String(row.customer_name ?? ''),
          contractedRevenue: Number(row.contracted_revenue ?? 0),
          endsAt: row.ends_at ? String(row.ends_at) : null,
        }))
      : [],
  };
}

export async function listCustomersForSelect(
  supabase: SupabaseClient,
  companyId: string,
): Promise<Customer[]> {
  const {data, error} = await supabase
    .from('customers')
    .select('id, company_id, branch_id, legal_name, trade_name, tax_id, email, phone, whatsapp, website, customer_status, segment, notes, sales_representative, credit_limit, payment_term_days, status, created_at, updated_at')
    .eq('company_id', companyId)
    .eq('customer_status', 'active')
    .is('deleted_at', null)
    .order('legal_name');

  if (error) throw new Error(mapDatabaseError(error));
  return (data as CustomerRow[]).map(mapCustomerRow);
}
