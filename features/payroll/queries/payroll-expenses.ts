import type {SupabaseClient} from '@supabase/supabase-js';

import {PAYROLL_SOURCE_MODULE} from '@/features/financial/constants/operation-financial';
import type {FinancialEntryStatus} from '@/features/financial/types';
import {mapDatabaseError} from '@/features/master/companies/utils/database-error';

import {PAYROLL_EXPENSE_LIST_COLUMNS, PAYROLL_EXPENSES_PAGE_SIZE} from '../constants';
import {mapPayrollExpenseRow} from '../services/mappers';
import {resolvePayrollPersonColumns} from '../services/payroll-rules';
import type {PayrollDuplicateRecord} from '../services/payroll-rules';
import type {
  PaginatedPayrollExpenses,
  PayrollExpense,
  PayrollExpenseRow,
  PayrollListFilters,
  PayrollSortOptions,
  PayrollSummary,
} from '../types';
import {normalizeCompetence} from '../utils/competence';
import type {CreatePayrollExpenseInput, UpdatePayrollExpenseInput} from '../validation';

export interface ListPayrollExpensesOptions {
  companyId: string;
  search?: string;
  sourceId?: string;
  page?: number;
  pageSize?: number;
  filters?: PayrollListFilters;
  sort?: PayrollSortOptions;
}

const SORT_COLUMNS: Record<NonNullable<PayrollSortOptions['sortBy']>, string> = {
  competence: 'competence',
  amount: 'amount',
  due_date: 'due_date',
  created_at: 'created_at',
};

const SUMMARY_ROW_LIMIT = 5000;

function sanitizeSearchTerm(value: string): string {
  return value.replace(/[%(),]/g, '').trim();
}

function buildExpensePayload(
  input: CreatePayrollExpenseInput | UpdatePayrollExpenseInput,
  profileId: string,
): Record<string, unknown> {
  return {
    ...resolvePayrollPersonColumns(input.personKind, input.personId),
    position_id: input.positionId,
    cost_center_id: input.costCenterId,
    branch_id: input.branchId,
    competence: input.competence,
    expense_type: input.expenseType,
    expense_status: input.expenseStatus,
    amount: input.amount,
    payment_method: input.paymentMethod,
    due_date: input.dueDate,
    paid_at: input.paidAt,
    notes: input.notes,
    updated_by: profileId,
  };
}

/**
 * Anexa a situação do lançamento financeiro de cada despesa. A baixa pode
 * acontecer em Contas a Pagar, então a folha não é a única fonte da verdade.
 */
async function attachFinancialStatus(
  supabase: SupabaseClient,
  companyId: string,
  expenses: PayrollExpense[],
): Promise<PayrollExpense[]> {
  if (expenses.length === 0) return expenses;

  const {data, error} = await supabase
    .from('financial_entries')
    .select('id, source_id, entry_status')
    .eq('company_id', companyId)
    .eq('source_module', PAYROLL_SOURCE_MODULE)
    .in(
      'source_id',
      expenses.map((expense) => expense.id),
    )
    .is('deleted_at', null)
    .neq('entry_status', 'reversed')
    .neq('entry_type', 'reversal');

  if (error || !data) return expenses;

  const bySourceId = new Map<string, {id: string; status: FinancialEntryStatus}>();
  for (const row of data) {
    const sourceId = row.source_id as string | null;
    if (!sourceId || bySourceId.has(sourceId)) continue;
    bySourceId.set(sourceId, {
      id: row.id as string,
      status: row.entry_status as FinancialEntryStatus,
    });
  }

  return expenses.map((expense) => {
    const entry = bySourceId.get(expense.id);
    if (!entry) return expense;
    return {...expense, financialEntryId: entry.id, financialStatus: entry.status};
  });
}

/**
 * Resolve os ids das pessoas cujo nome casa com a busca, para filtrar despesas
 * por funcionário sem depender de filtro em recurso aninhado.
 */
async function resolvePersonIdsBySearch(
  supabase: SupabaseClient,
  companyId: string,
  search: string,
): Promise<string[]> {
  const {data, error} = await supabase
    .from('payroll_people')
    .select('id')
    .eq('company_id', companyId)
    .ilike('name', `%${search}%`)
    .limit(200);

  if (error) return [];
  return (data ?? []).map((row) => row.id as string);
}

interface PayrollFilterClauses {
  equals: [string, string][];
  or: string | null;
}

/** Traduz os filtros de folha para cláusulas aplicáveis a qualquer query. */
export function buildPayrollFilterClauses(
  filters: PayrollListFilters,
): PayrollFilterClauses {
  const equals: [string, string][] = [];

  const competence = normalizeCompetence(filters.competence);
  if (competence) equals.push(['competence', competence]);
  if (filters.positionId) equals.push(['position_id', filters.positionId]);
  if (filters.costCenterId) equals.push(['cost_center_id', filters.costCenterId]);
  if (filters.expenseType) equals.push(['expense_type', filters.expenseType]);
  if (filters.expenseStatus) equals.push(['expense_status', filters.expenseStatus]);

  return {
    equals,
    or: filters.personId
      ? `employee_id.eq.${filters.personId},driver_id.eq.${filters.personId}`
      : null,
  };
}

export async function listPayrollExpenses(
  supabase: SupabaseClient,
  options: ListPayrollExpensesOptions,
): Promise<PaginatedPayrollExpenses> {
  const search = sanitizeSearchTerm(options.search ?? '');
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? PAYROLL_EXPENSES_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const filters = options.filters ?? {};
  const sortBy = options.sort?.sortBy ?? 'competence';
  const sortOrder = options.sort?.sortOrder ?? 'desc';
  const sortColumn = SORT_COLUMNS[sortBy] ?? 'competence';

  let query = supabase
    .from('payroll_expenses')
    .select(PAYROLL_EXPENSE_LIST_COLUMNS, {count: 'exact'})
    .eq('company_id', options.companyId)
    .is('deleted_at', null);

  const clauses = buildPayrollFilterClauses(filters);
  for (const [column, value] of clauses.equals) {
    query = query.eq(column, value);
  }
  if (clauses.or) {
    query = query.or(clauses.or);
  }
  if (options.sourceId) {
    query = query.eq('id', options.sourceId);
  }

  if (search) {
    const personIds = await resolvePersonIdsBySearch(supabase, options.companyId, search);
    const searchClauses = [`notes.ilike.%${search}%`];
    if (personIds.length > 0) {
      const list = personIds.join(',');
      searchClauses.push(`employee_id.in.(${list})`, `driver_id.in.(${list})`);
    }
    query = query.or(searchClauses.join(','));
  }

  const {data, error, count} = await query
    .order(sortColumn, {ascending: sortOrder === 'asc', nullsFirst: false})
    .order('created_at', {ascending: false})
    .range(from, to);

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  const total = count ?? 0;
  const items = await attachFinancialStatus(
    supabase,
    options.companyId,
    (data ?? []).map((row) => mapPayrollExpenseRow(row as unknown as PayrollExpenseRow)),
  );

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getPayrollSummary(
  supabase: SupabaseClient,
  companyId: string,
  filters: PayrollListFilters = {},
): Promise<PayrollSummary> {
  let query = supabase
    .from('payroll_expenses')
    .select('amount, expense_status, employee_id, driver_id')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .limit(SUMMARY_ROW_LIMIT);

  const clauses = buildPayrollFilterClauses(filters);
  for (const [column, value] of clauses.equals) {
    query = query.eq(column, value);
  }
  if (clauses.or) {
    query = query.or(clauses.or);
  }

  const {data, error} = await query;

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  const people = new Set<string>();
  let totalCompetence = 0;
  let totalPaid = 0;
  let totalPending = 0;

  for (const row of data ?? []) {
    const amount = Number(row.amount ?? 0);
    const status = row.expense_status as string;

    if (status === 'cancelled') continue;

    totalCompetence += amount;
    if (status === 'paid') totalPaid += amount;
    if (status === 'pending') totalPending += amount;

    const personId = (row.driver_id ?? row.employee_id) as string | null;
    if (personId) people.add(personId);
  }

  return {
    totalCompetence,
    totalPaid,
    totalPending,
    peopleCount: people.size,
  };
}

export async function getPayrollExpenseById(
  supabase: SupabaseClient,
  companyId: string,
  expenseId: string,
): Promise<PayrollExpense | null> {
  const {data, error} = await supabase
    .from('payroll_expenses')
    .select(PAYROLL_EXPENSE_LIST_COLUMNS)
    .eq('id', expenseId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  if (!data) return null;

  const [expense] = await attachFinancialStatus(supabase, companyId, [
    mapPayrollExpenseRow(data as unknown as PayrollExpenseRow),
  ]);
  return expense ?? null;
}

/** Despesas da mesma pessoa/competência/tipo, para a checagem suave de duplicidade. */
export async function listPayrollDuplicateCandidates(
  supabase: SupabaseClient,
  companyId: string,
  probe: {personId: string; competence: string; expenseType: string},
): Promise<PayrollDuplicateRecord[]> {
  const competence = normalizeCompetence(probe.competence);
  if (!competence) return [];

  const {data, error} = await supabase
    .from('payroll_expenses')
    .select('id, employee_id, driver_id, competence, expense_type')
    .eq('company_id', companyId)
    .eq('competence', competence)
    .eq('expense_type', probe.expenseType)
    .or(`employee_id.eq.${probe.personId},driver_id.eq.${probe.personId}`)
    .is('deleted_at', null)
    .limit(50);

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    personId: ((row.driver_id ?? row.employee_id) as string | null) ?? '',
    competence: row.competence as string,
    expenseType: row.expense_type as PayrollDuplicateRecord['expenseType'],
  }));
}

export async function createPayrollExpense(
  supabase: SupabaseClient,
  companyId: string,
  input: CreatePayrollExpenseInput,
  profileId: string,
): Promise<PayrollExpense> {
  const {data, error} = await supabase
    .from('payroll_expenses')
    .insert({
      ...buildExpensePayload(input, profileId),
      company_id: companyId,
      created_by: profileId,
    })
    .select(PAYROLL_EXPENSE_LIST_COLUMNS)
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapPayrollExpenseRow(data as unknown as PayrollExpenseRow);
}

export async function updatePayrollExpense(
  supabase: SupabaseClient,
  companyId: string,
  expenseId: string,
  input: UpdatePayrollExpenseInput,
  profileId: string,
): Promise<PayrollExpense> {
  const {data, error} = await supabase
    .from('payroll_expenses')
    .update(buildExpensePayload(input, profileId))
    .eq('id', expenseId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .select(PAYROLL_EXPENSE_LIST_COLUMNS)
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapPayrollExpenseRow(data as unknown as PayrollExpenseRow);
}

export async function softDeletePayrollExpense(
  supabase: SupabaseClient,
  companyId: string,
  expenseId: string,
  profileId: string,
): Promise<void> {
  const {error} = await supabase
    .from('payroll_expenses')
    .update({
      deleted_at: new Date().toISOString(),
      status: 'archived',
      updated_by: profileId,
    })
    .eq('id', expenseId)
    .eq('company_id', companyId)
    .is('deleted_at', null);

  if (error) {
    throw new Error(mapDatabaseError(error));
  }
}
