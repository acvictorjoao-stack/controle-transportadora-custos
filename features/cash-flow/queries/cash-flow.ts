import type {SupabaseClient} from '@supabase/supabase-js';

import {ACCOUNTS_PAYABLE_SOURCE_MODULE} from '@/features/accounts-payable/constants';
import {ACCOUNTS_RECEIVABLE_SOURCE_MODULE} from '@/features/accounts-receivable/constants';
import {listFinancialEntriesByIds} from '@/features/financial/queries';
import type {
  FinancialEntryStatus,
  FinancialEntryType,
  FinancialListFilters,
} from '@/features/financial/types';
import {mapDatabaseError} from '@/features/master/companies/utils/database-error';
import {fetchAllPagedRows} from '@/lib/supabase/fetch-all-pages';

import {CASH_FLOW_PAGE_SIZE, CASH_FLOW_SOURCE_MODULES} from '../constants';
import type {
  CashFlowLine,
  CashFlowListFilters,
  CashFlowSummary,
  PaginatedCashFlow,
} from '../types';
import {
  getCashFlowSignedLineAmount,
  getCashFlowType,
  mapCashFlowLine,
} from '../utils/cash-flow-mappers';

type CashFlowLineRow = {
  line_id: string;
  financial_entry_id: string;
  entry_type: FinancialEntryType;
  line_status: FinancialEntryStatus;
  source_module: string | null;
  movement_date: string;
  line_amount: number;
};

const CASH_FLOW_VIEW = 'financial_cash_flow_lines';

const LINE_COLUMNS =
  'line_id, financial_entry_id, entry_type, line_status, source_module, movement_date, line_amount';

function sanitizeSearchTerm(value: string): string {
  return value.replace(/[%(),]/g, '').trim();
}

function isOpenStatus(status: FinancialEntryStatus): boolean {
  return status === 'pending' || status === 'overdue';
}

function postgrestError(error: {message: string; code?: string}): Error {
  return new Error(mapDatabaseError(error));
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

function signedLineAmount(row: CashFlowLineRow): number {
  const type = getCashFlowType({sourceModule: row.source_module, entryType: row.entry_type});
  return getCashFlowSignedLineAmount(type, Number(row.line_amount));
}

function sumSigned(rows: CashFlowLineRow[]): number {
  return rows.reduce((sum, row) => sum + signedLineAmount(row), 0);
}

async function fetchLineRows(
  supabase: SupabaseClient,
  companyId: string,
  filters: CashFlowListFilters,
  search: string | undefined,
): Promise<CashFlowLineRow[]> {
  const resolved = resolveListFilters(filters);
  const term = sanitizeSearchTerm(search ?? '');

  return fetchAllPagedRows<CashFlowLineRow>(
    async (from, to) => {
      let query = supabase
        .from(CASH_FLOW_VIEW)
        .select(LINE_COLUMNS, {count: 'exact'})
        .eq('company_id', companyId)
        .is('deleted_at', null);

      if (resolved.sourceModules?.length) {
        query = query.in('source_module', resolved.sourceModules);
      } else if (resolved.sourceModule) {
        query = query.eq('source_module', resolved.sourceModule);
      }

      if (resolved.entryType) query = query.eq('entry_type', resolved.entryType);

      if (resolved.entryStatuses?.length) {
        query = query.in('line_status', resolved.entryStatuses);
      } else if (resolved.entryStatus) {
        query = query.eq('line_status', resolved.entryStatus);
      }

      if (resolved.dateFrom) query = query.gte('movement_date', resolved.dateFrom);
      if (resolved.dateTo) query = query.lte('movement_date', resolved.dateTo);

      if (term) {
        query = query.or(
          `description.ilike.%${term}%,supplier.ilike.%${term}%,client.ilike.%${term}%`,
        );
      }

      return query
        .order('movement_date', {ascending: false})
        .order('line_id', {ascending: false})
        .range(from, to);
    },
    {mapError: postgrestError},
  );
}

export async function getCashFlowSummary(
  supabase: SupabaseClient,
  companyId: string,
  options?: {dateFrom?: string; dateTo?: string},
): Promise<CashFlowSummary> {
  const rows = await fetchLineRows(
    supabase,
    companyId,
    {dateFrom: options?.dateFrom, dateTo: options?.dateTo},
    undefined,
  );

  let entradasRecebidas = 0;
  let saidasPagas = 0;
  let aReceber = 0;
  let aPagar = 0;

  for (const row of rows) {
    const amount = Number(row.line_amount);
    const isReceivable =
      row.source_module === ACCOUNTS_RECEIVABLE_SOURCE_MODULE ||
      row.entry_type === 'revenue';
    const isPayable =
      row.source_module === ACCOUNTS_PAYABLE_SOURCE_MODULE ||
      row.entry_type === 'expense';

    if (row.line_status === 'paid') {
      if (isReceivable) entradasRecebidas += amount;
      if (isPayable) saidasPagas += amount;
      continue;
    }

    if (isOpenStatus(row.line_status)) {
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

  const rows = await fetchLineRows(supabase, options.companyId, filters, options.search);
  const pageRows = rows.slice(from, from + pageSize);
  const entries = await listFinancialEntriesByIds(
    supabase,
    options.companyId,
    pageRows.map((row) => row.financial_entry_id),
  );
  const entryById = new Map(entries.map((entry) => [entry.id, entry] as const));

  let runningBalance = sumSigned(rows) - sumSigned(rows.slice(0, from));

  const items: CashFlowLine[] = [];
  for (const row of pageRows) {
    const entry = entryById.get(row.financial_entry_id);
    if (!entry) continue;

    const line = mapCashFlowLine(
      entry,
      {
        lineId: row.line_id,
        status: row.line_status,
        movementDate: row.movement_date,
        amount: Number(row.line_amount),
      },
      runningBalance,
    );
    runningBalance -= line.signedAmount;
    items.push(line);
  }

  return {
    items,
    total: rows.length,
    page,
    pageSize,
    totalPages: Math.ceil(rows.length / pageSize),
  };
}
