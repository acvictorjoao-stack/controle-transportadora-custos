import type {SupabaseClient} from '@supabase/supabase-js';

import {
  createFinancialEntry,
  getFinancialDetail,
  getFinancialEntryById,
  cancelFinancialEntry,
  listFinancialEntries,
  listFinancialFilterOptions,
  listFinancialHistory,
  markFinancialEntryPaid,
  softDeleteFinancialEntry,
  updateFinancialEntry,
} from '@/features/financial/queries';
import type {FinancialEntry} from '@/features/financial/types';

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
} from '../types';
import type {
  CreateAccountsReceivableInput,
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

  const history = await listFinancialHistory(supabase, companyId, entryId);
  return {entry: detail.entry, history};
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
      supplier: existing.supplier,
      client: input.client,
      amount: input.amount,
      currency: existing.currency || 'BRL',
      entryDate: input.entryDate,
      dueDate: input.dueDate,
      notes: input.notes,
    },
    profileId,
  );
}

export async function markAccountsReceivableReceived(
  supabase: SupabaseClient,
  companyId: string,
  entryId: string,
  profileId: string,
  input: {paidAt: string; paidAmount: number},
): Promise<AccountsReceivableEntry> {
  const existing = assertAccountsReceivableEntry(
    await getFinancialEntryById(supabase, companyId, entryId),
  );

  if (existing.entryStatus === 'paid') {
    throw new Error('Conta já está recebida.');
  }

  if (existing.entryStatus === 'cancelled') {
    throw new Error('Não é possível receber uma conta cancelada.');
  }

  const paidAtIso = input.paidAt.includes('T')
    ? input.paidAt
    : `${input.paidAt}T12:00:00.000Z`;

  return markFinancialEntryPaid(supabase, companyId, entryId, profileId, {
    paidAt: paidAtIso,
    paidAmount: input.paidAmount,
  });
}

export async function cancelAccountsReceivable(
  supabase: SupabaseClient,
  companyId: string,
  entryId: string,
  profileId: string,
): Promise<AccountsReceivableEntry> {
  assertAccountsReceivableEntry(await getFinancialEntryById(supabase, companyId, entryId));
  return cancelFinancialEntry(supabase, companyId, entryId, profileId);
}

export async function deleteAccountsReceivable(
  supabase: SupabaseClient,
  companyId: string,
  entryId: string,
  profileId: string,
): Promise<void> {
  assertAccountsReceivableEntry(await getFinancialEntryById(supabase, companyId, entryId));
  await softDeleteFinancialEntry(supabase, companyId, entryId, profileId);
}
