import type {SupabaseClient} from '@supabase/supabase-js';

import {ACCOUNTS_PAYABLE_SOURCE_MODULE} from '@/features/accounts-payable/constants';
import {ACCOUNTS_RECEIVABLE_SOURCE_MODULE} from '@/features/accounts-receivable/constants';
import {listFinancialEntries} from '@/features/financial/queries';
import type {
  FinancialEntry,
  FinancialEntryStatus,
  FinancialEntryType,
  FinancialListFilters,
} from '@/features/financial/types';
import {mapDatabaseError} from '@/features/master/companies/utils/database-error';

import {CASH_FLOW_PAGE_SIZE, CASH_FLOW_SOURCE_MODULES} from '../constants';
import type {
  CashFlowListFilters,
  CashFlowSummary,
  PaginatedCashFlow,
} from '../types';
import {
  getCashFlowSignedAmount,
  mapCashFlowLine,
} from '../utils/cash-flow-mappers';

type AggregateRow = {
  entry_type: FinancialEntryType;
  entry_status: FinancialEntryStatus;
  amount: number;
  paid_amount: number | null;
  source_module: string | null;
  entry_date: string;
  due_date: string | null;
  paid_at: string | null;
};

const AGGREGATE_COLUMNS =
  'entry_type, entry_status, amount, paid_amount, source_module, entry_date, due_date, paid_at';

function sanitizeSearchTerm(value: string): string {
  return value.replace(/[%(),]/g, '').trim();
}

function isOpenStatus(status: FinancialEntryStatus): boolean {
  return status === 'pending' || status === 'overdue';
}

function resolveListFilters(filters: CashFlowListFilters = {}): FinancialListFilters {
  const financialFilters: FinancialListFilters = {
    sourceModules: [...CASH_FLOW_SOURCE_MODULES],
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  };

  if (filters.cashFlowType === 'recebimento') {
    financialFilters.sourceModule = ACCOUNTS_RECEIVABLE_SOURCE_MODULE;
    financialFilters.sourceModules = undefined;
    financialFilters.entryType = 'revenue';
  } else if (filters.cashFlowType === 'pagamento') {
    financialFilters.sourceModule = ACCOUNTS_PAYABLE_SOURCE_MODULE;
    financialFilters.sourceModules = undefined;
    financialFilters.entryType = 'expense';
  }

  if (filters.entryStatus === 'pending') {
    financialFilters.entryStatuses = ['pending', 'overdue'];
  } else if (filters.entryStatus) {
    financialFilters.entryStatus = filters.entryStatus;
  } else {
    financialFilters.entryStatuses = ['pending', 'overdue', 'paid'];
  }

  return financialFilters;
}

function toAggregateEntry(row: AggregateRow): FinancialEntry {
  return {
    id: '',
    companyId: '',
    branchId: null,
    branchName: null,
    vehicleId: null,
    vehiclePlate: null,
    driverId: null,
    driverName: null,
    tripId: null,
    tripNumber: null,
    fuelRecordId: null,
    maintenanceRecordId: null,
    tireId: null,
    customerId: null,
    customerContractId: null,
    customerName: null,
    categoryId: null,
    categoryName: null,
    categorySlug: null,
    costCenterId: null,
    costCenterName: null,
    entryType: row.entry_type,
    entryStatus: row.entry_status,
    description: null,
    referenceNumber: null,
    supplierId: null,
    supplier: null,
    client: null,
    amount: Number(row.amount),
    currency: 'BRL',
    entryDate: row.entry_date,
    dueDate: row.due_date,
    paidAt: row.paid_at,
    paidAmount: row.paid_amount != null ? Number(row.paid_amount) : null,
    reversedEntryId: null,
    sourceModule: row.source_module,
    sourceId: null,
    isSystemGenerated: false,
    installmentNumber: null,
    installmentTotal: null,
    notes: null,
    externalId: null,
    integrationSource: null,
    metadata: {},
    status: 'active',
    createdAt: '',
    updatedAt: '',
  };
}

function sumSigned(rows: AggregateRow[]): number {
  return rows.reduce((sum, row) => sum + getCashFlowSignedAmount(toAggregateEntry(row)), 0);
}

async function fetchAggregateRows(
  supabase: SupabaseClient,
  companyId: string,
  filters: CashFlowListFilters,
  search: string | undefined,
  range?: {from: number; to: number},
): Promise<AggregateRow[]> {
  const resolved = resolveListFilters(filters);
  const term = sanitizeSearchTerm(search ?? '');

  let query = supabase
    .from('financial_entries')
    .select(AGGREGATE_COLUMNS)
    .eq('company_id', companyId)
    .is('deleted_at', null);

  if (resolved.sourceModules?.length) {
    query = query.in('source_module', resolved.sourceModules);
  } else if (resolved.sourceModule) {
    query = query.eq('source_module', resolved.sourceModule);
  }

  if (resolved.entryType) {
    query = query.eq('entry_type', resolved.entryType);
  }

  if (resolved.entryStatuses?.length) {
    query = query.in('entry_status', resolved.entryStatuses);
  } else if (resolved.entryStatus) {
    query = query.eq('entry_status', resolved.entryStatus);
  }

  if (resolved.dateFrom) query = query.gte('entry_date', resolved.dateFrom);
  if (resolved.dateTo) query = query.lte('entry_date', resolved.dateTo);

  if (term) {
    query = query.or(
      `description.ilike.%${term}%,supplier.ilike.%${term}%,client.ilike.%${term}%`,
    );
  }

  query = query.order('entry_date', {ascending: false, nullsFirst: false});

  if (range) {
    query = query.range(range.from, range.to);
  }

  const {data, error} = await query;

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return (data ?? []) as AggregateRow[];
}

export async function getCashFlowSummary(
  supabase: SupabaseClient,
  companyId: string,
  options?: {dateFrom?: string; dateTo?: string},
): Promise<CashFlowSummary> {
  let query = supabase
    .from('financial_entries')
    .select('entry_type, entry_status, amount, paid_amount, source_module')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .in('source_module', [...CASH_FLOW_SOURCE_MODULES])
    .in('entry_status', ['pending', 'overdue', 'paid']);

  if (options?.dateFrom) query = query.gte('entry_date', options.dateFrom);
  if (options?.dateTo) query = query.lte('entry_date', options.dateTo);

  const {data, error} = await query;

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  let entradasRecebidas = 0;
  let saidasPagas = 0;
  let aReceber = 0;
  let aPagar = 0;

  for (const row of data ?? []) {
    const amount =
      row.entry_status === 'paid' && row.paid_amount != null
        ? Number(row.paid_amount)
        : Number(row.amount);
    const isReceivable =
      row.source_module === ACCOUNTS_RECEIVABLE_SOURCE_MODULE || row.entry_type === 'revenue';
    const isPayable =
      row.source_module === ACCOUNTS_PAYABLE_SOURCE_MODULE || row.entry_type === 'expense';

    if (row.entry_status === 'paid') {
      if (isReceivable) entradasRecebidas += amount;
      if (isPayable) saidasPagas += amount;
      continue;
    }

    if (isOpenStatus(row.entry_status as FinancialEntryStatus)) {
      if (isReceivable) aReceber += amount;
      if (isPayable) aPagar += amount;
    }
  }

  const saldoAtual = entradasRecebidas - saidasPagas;
  const saldoProjetado = saldoAtual + aReceber - aPagar;

  return {
    entradasRecebidas,
    saidasPagas,
    saldoAtual,
    aReceber,
    aPagar,
    saldoProjetado,
  };
}

export async function listCashFlow(
  supabase: SupabaseClient,
  options: {
    companyId: string;
    search?: string;
    page?: number;
    filters?: CashFlowListFilters;
  },
): Promise<PaginatedCashFlow> {
  const page = options.page ?? 1;
  const pageSize = CASH_FLOW_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const filters = options.filters ?? {};
  const financialFilters = resolveListFilters(filters);

  const [paginated, priorRows, totalRows] = await Promise.all([
    listFinancialEntries(supabase, {
      companyId: options.companyId,
      search: options.search,
      page,
      pageSize,
      filters: financialFilters,
      sort: {sortBy: 'entry_date', sortOrder: 'desc'},
    }),
    page > 1
      ? fetchAggregateRows(supabase, options.companyId, filters, options.search, {
          from: 0,
          to: from - 1,
        })
      : Promise.resolve([] as AggregateRow[]),
    fetchAggregateRows(supabase, options.companyId, filters, options.search),
  ]);

  let runningBalance = sumSigned(totalRows) - sumSigned(priorRows);

  const items = paginated.items.map((entry) => {
    const line = mapCashFlowLine(entry, runningBalance);
    runningBalance -= line.signedAmount;
    return line;
  });

  return {
    items,
    total: paginated.total,
    page: paginated.page,
    pageSize: paginated.pageSize,
    totalPages: paginated.totalPages,
  };
}
