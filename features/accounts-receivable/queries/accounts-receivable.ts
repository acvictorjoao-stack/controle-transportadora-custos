import type {SupabaseClient} from '@supabase/supabase-js';

import {
  createFinancialEntry,
  getFinancialDetail,
  getFinancialEntryById,
  cancelFinancialEntry,
  listFinancialEntries,
  listFinancialFilterOptions,
  listFinancialHistory,
  softDeleteFinancialEntry,
  updateFinancialEntry,
} from '@/features/financial/queries';
import {mapFinancialEntryRow} from '@/features/financial/services/mappers';
import {FINANCIAL_LIST_COLUMNS} from '@/features/financial/constants';
import type {FinancialEntry, FinancialEntryRow} from '@/features/financial/types';
import {mapDatabaseError} from '@/features/master/companies/utils/database-error';

import {
  ACCOUNTS_RECEIVABLE_PAGE_SIZE,
  ACCOUNTS_RECEIVABLE_SOURCE_MODULE,
} from '../constants';
import type {
  AccountsReceivableDetailData,
  AccountsReceivableEntry,
  AccountsReceivableListFilters,
  AccountsReceivableSortOptions,
  PaginatedAccountsReceivable,
  ReceivableMovement,
  ReceivableMovementKind,
  ReceivablePaymentMethod,
} from '../types';
import type {
  AdjustReceivableAmountInput,
  CreateAccountsReceivableInput,
  ParsedReceiptInput,
  ReverseReceivableReceiptInput,
  UpdateAccountsReceivableInput,
} from '../validation';

function assertAccountsReceivableEntry(entry: FinancialEntry | null): AccountsReceivableEntry {
  if (!entry || entry.sourceModule !== ACCOUNTS_RECEIVABLE_SOURCE_MODULE) {
    throw new Error('Conta a receber não encontrada.');
  }
  return entry;
}

export async function listAccountsReceivable(
  supabase: SupabaseClient,
  options: {
    companyId: string;
    search?: string;
    page?: number;
    filters?: AccountsReceivableListFilters;
    sort?: AccountsReceivableSortOptions;
  },
): Promise<PaginatedAccountsReceivable> {
  return listFinancialEntries(supabase, {
    companyId: options.companyId,
    search: options.search,
    page: options.page,
    pageSize: ACCOUNTS_RECEIVABLE_PAGE_SIZE,
    filters: {
      sourceModule: ACCOUNTS_RECEIVABLE_SOURCE_MODULE,
      entryType: 'revenue',
      entryStatus: options.filters?.entryStatus,
      categoryId: options.filters?.categoryId,
      client: options.filters?.client,
      dueDateFrom: options.filters?.dueDateFrom,
      dueDateTo: options.filters?.dueDateTo,
      dateFrom: options.filters?.dateFrom,
      dateTo: options.filters?.dateTo,
    },
    sort: {
      sortBy: options.sort?.sortBy ?? 'due_date',
      sortOrder: options.sort?.sortOrder ?? 'asc',
    },
  });
}

export async function listAccountsReceivableFilterOptions(
  supabase: SupabaseClient,
  companyId: string,
) {
  return listFinancialFilterOptions(supabase, companyId);
}

export async function getAccountsReceivableById(
  supabase: SupabaseClient,
  companyId: string,
  entryId: string,
): Promise<AccountsReceivableEntry | null> {
  const entry = await getFinancialEntryById(supabase, companyId, entryId);
  if (!entry || entry.sourceModule !== ACCOUNTS_RECEIVABLE_SOURCE_MODULE) {
    return null;
  }
  return entry;
}

export async function getAccountsReceivableDetail(
  supabase: SupabaseClient,
  companyId: string,
  entryId: string,
): Promise<AccountsReceivableDetailData | null> {
  const detail = await getFinancialDetail(supabase, companyId, entryId);
  if (!detail || detail.entry.sourceModule !== ACCOUNTS_RECEIVABLE_SOURCE_MODULE) {
    return null;
  }

  const [history, movements] = await Promise.all([
    listFinancialHistory(supabase, companyId, entryId),
    listReceivableMovements(supabase, companyId, entryId),
  ]);
  return {entry: detail.entry, history, movements};
}

type ReceivableMovementRow = {
  id: string;
  kind: ReceivableMovementKind;
  amount: number;
  movement_date: string;
  payment_method: ReceivablePaymentMethod | null;
  notes: string | null;
  reason: string | null;
  reverses_movement_id: string | null;
  created_at: string;
  profiles: {full_name: string | null} | {full_name: string | null}[] | null;
};

export async function listReceivableMovements(
  supabase: SupabaseClient,
  companyId: string,
  entryId: string,
): Promise<ReceivableMovement[]> {
  const {data, error} = await supabase
    .from('financial_entry_movements')
    .select(
      'id, kind, amount, movement_date, payment_method, notes, reason, reverses_movement_id, created_at, profiles:created_by (full_name)',
    )
    .eq('company_id', companyId)
    .eq('financial_entry_id', entryId)
    .order('created_at', {ascending: false});

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return ((data ?? []) as unknown as ReceivableMovementRow[]).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      kind: row.kind,
      amount: Number(row.amount),
      movementDate: row.movement_date,
      paymentMethod: row.payment_method,
      notes: row.notes,
      reason: row.reason,
      reversesMovementId: row.reverses_movement_id,
      createdAt: row.created_at,
      createdByName: profile?.full_name ?? null,
    };
  });
}

/** Títulos gerados pela viagem. A RLS devolve vazio para quem não lê o financeiro. */
export async function listTripReceivables(
  supabase: SupabaseClient,
  companyId: string,
  tripId: string,
): Promise<AccountsReceivableEntry[]> {
  const {data, error} = await supabase
    .from('financial_entries')
    .select(FINANCIAL_LIST_COLUMNS)
    .eq('company_id', companyId)
    .eq('trip_id', tripId)
    .eq('source_module', ACCOUNTS_RECEIVABLE_SOURCE_MODULE)
    .is('deleted_at', null)
    .order('created_at', {ascending: true});

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return ((data ?? []) as unknown as FinancialEntryRow[]).map(mapFinancialEntryRow);
}

export async function createAccountsReceivable(
  supabase: SupabaseClient,
  companyId: string,
  input: CreateAccountsReceivableInput,
  profileId: string,
): Promise<AccountsReceivableEntry> {
  return createFinancialEntry(
    supabase,
    companyId,
    {
      branchId: null,
      vehicleId: null,
      driverId: null,
      tripId: null,
      categoryId: input.categoryId,
      costCenterId: input.costCenterId,
      entryType: 'revenue',
      entryStatus: 'pending',
      description: input.description,
      referenceNumber: null,
      supplierId: null,
      supplier: null,
      client: input.client,
      amount: input.amount,
      currency: 'BRL',
      entryDate: input.entryDate,
      dueDate: input.dueDate,
      notes: input.notes,
    },
    profileId,
    {
      source_module: ACCOUNTS_RECEIVABLE_SOURCE_MODULE,
      is_system_generated: false,
    },
  );
}

export async function updateAccountsReceivable(
  supabase: SupabaseClient,
  companyId: string,
  entryId: string,
  input: UpdateAccountsReceivableInput,
  profileId: string,
): Promise<AccountsReceivableEntry> {
  const existing = assertAccountsReceivableEntry(
    await getFinancialEntryById(supabase, companyId, entryId),
  );

  if (existing.entryStatus === 'cancelled') {
    throw new Error('Não é possível editar uma conta cancelada.');
  }

  // Valor, cliente e datas do título de frete vêm da viagem; com recebimento,
  // o valor só muda por ajuste.
  const fromTrip = existing.tripChargeKey != null;
  const amountLocked = fromTrip || existing.paidAmount != null;

  return updateFinancialEntry(
    supabase,
    companyId,
    entryId,
    {
      branchId: existing.branchId,
      vehicleId: existing.vehicleId,
      driverId: existing.driverId,
      tripId: existing.tripId,
      categoryId: input.categoryId,
      costCenterId: input.costCenterId,
      entryType: 'revenue',
      entryStatus: existing.entryStatus,
      description: input.description,
      referenceNumber: existing.referenceNumber,
      supplierId: existing.supplierId,
      supplier: existing.supplier,
      client: fromTrip ? existing.client : input.client,
      amount: amountLocked ? existing.amount : input.amount,
      currency: existing.currency || 'BRL',
      entryDate: fromTrip ? existing.entryDate : input.entryDate,
      dueDate: fromTrip ? existing.dueDate : input.dueDate,
      notes: input.notes,
    },
    profileId,
  );
}

export async function markAccountsReceivableReceived(
  supabase: SupabaseClient,
  companyId: string,
  entryId: string,
  input: ParsedReceiptInput,
): Promise<AccountsReceivableEntry> {
  const {error} = await supabase.rpc('register_receivable_receipt', {
    p_entry_id: entryId,
    p_amount: input.paidAmount,
    p_movement_date: input.paidAt.slice(0, 10),
    p_payment_method: input.paymentMethod,
    p_notes: input.notes,
    p_idempotency_key: input.idempotencyKey,
  });

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return assertAccountsReceivableEntry(
    await getFinancialEntryById(supabase, companyId, entryId),
  );
}

export async function reverseReceivableReceipt(
  supabase: SupabaseClient,
  movementId: string,
  input: ReverseReceivableReceiptInput,
): Promise<void> {
  const {error} = await supabase.rpc('reverse_receivable_receipt', {
    p_movement_id: movementId,
    p_reason: input.reason,
    p_idempotency_key: input.idempotencyKey,
  });

  if (error) {
    throw new Error(mapDatabaseError(error));
  }
}

export async function adjustReceivableAmount(
  supabase: SupabaseClient,
  companyId: string,
  entryId: string,
  input: AdjustReceivableAmountInput,
): Promise<AccountsReceivableEntry> {
  const {error} = await supabase.rpc('adjust_receivable_amount', {
    p_entry_id: entryId,
    p_new_amount: input.newAmount,
    p_reason: input.reason,
    p_idempotency_key: input.idempotencyKey,
  });

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return assertAccountsReceivableEntry(
    await getFinancialEntryById(supabase, companyId, entryId),
  );
}

export async function cancelAccountsReceivable(
  supabase: SupabaseClient,
  companyId: string,
  entryId: string,
  profileId: string,
): Promise<AccountsReceivableEntry> {
  const entry = assertAccountsReceivableEntry(
    await getFinancialEntryById(supabase, companyId, entryId),
  );
  if (entry.tripChargeKey) {
    throw new Error('Este título acompanha a viagem. Cancele a viagem de origem.');
  }
  return cancelFinancialEntry(supabase, companyId, entryId, profileId);
}

export async function deleteAccountsReceivable(
  supabase: SupabaseClient,
  companyId: string,
  entryId: string,
  profileId: string,
): Promise<void> {
  const entry = assertAccountsReceivableEntry(
    await getFinancialEntryById(supabase, companyId, entryId),
  );
  if (entry.tripChargeKey) {
    throw new Error('Este título acompanha a viagem. Cancele a viagem de origem.');
  }
  await softDeleteFinancialEntry(supabase, companyId, entryId, profileId);
}
