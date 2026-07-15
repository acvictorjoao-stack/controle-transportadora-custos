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

import {ACCOUNTS_PAYABLE_PAGE_SIZE, ACCOUNTS_PAYABLE_SOURCE_MODULE} from '../constants';
import type {
  AccountsPayableDetailData,
  AccountsPayableEntry,
  AccountsPayableListFilters,
  AccountsPayableSortOptions,
  PaginatedAccountsPayable,
} from '../types';
import type {
  CreateAccountsPayableInput,
  UpdateAccountsPayableInput,
} from '../validation';

function assertAccountsPayableEntry(entry: FinancialEntry | null): AccountsPayableEntry {
  if (!entry || entry.sourceModule !== ACCOUNTS_PAYABLE_SOURCE_MODULE) {
    throw new Error('Conta a pagar não encontrada.');
  }
  return entry;
}

export async function listAccountsPayable(
  supabase: SupabaseClient,
  options: {
    companyId: string;
    search?: string;
    page?: number;
    filters?: AccountsPayableListFilters;
    sort?: AccountsPayableSortOptions;
  },
): Promise<PaginatedAccountsPayable> {
  return listFinancialEntries(supabase, {
    companyId: options.companyId,
    search: options.search,
    page: options.page,
    pageSize: ACCOUNTS_PAYABLE_PAGE_SIZE,
    filters: {
      sourceModule: ACCOUNTS_PAYABLE_SOURCE_MODULE,
      entryType: 'expense',
      entryStatus: options.filters?.entryStatus,
      categoryId: options.filters?.categoryId,
      supplier: options.filters?.supplier,
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

export async function listAccountsPayableFilterOptions(
  supabase: SupabaseClient,
  companyId: string,
) {
  return listFinancialFilterOptions(supabase, companyId);
}

export async function getAccountsPayableById(
  supabase: SupabaseClient,
  companyId: string,
  entryId: string,
): Promise<AccountsPayableEntry | null> {
  const entry = await getFinancialEntryById(supabase, companyId, entryId);
  if (!entry || entry.sourceModule !== ACCOUNTS_PAYABLE_SOURCE_MODULE) {
    return null;
  }
  return entry;
}

export async function getAccountsPayableDetail(
  supabase: SupabaseClient,
  companyId: string,
  entryId: string,
): Promise<AccountsPayableDetailData | null> {
  const detail = await getFinancialDetail(supabase, companyId, entryId);
  if (!detail || detail.entry.sourceModule !== ACCOUNTS_PAYABLE_SOURCE_MODULE) {
    return null;
  }

  const history = await listFinancialHistory(supabase, companyId, entryId);
  return {entry: detail.entry, history};
}

export async function createAccountsPayable(
  supabase: SupabaseClient,
  companyId: string,
  input: CreateAccountsPayableInput,
  profileId: string,
): Promise<AccountsPayableEntry> {
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
      entryType: 'expense',
      entryStatus: 'pending',
      description: input.description,
      referenceNumber: null,
      supplier: input.supplier,
      client: null,
      amount: input.amount,
      currency: 'BRL',
      entryDate: input.entryDate,
      dueDate: input.dueDate,
      notes: input.notes,
    },
    profileId,
    {
      source_module: ACCOUNTS_PAYABLE_SOURCE_MODULE,
      is_system_generated: false,
    },
  );
}

export async function updateAccountsPayable(
  supabase: SupabaseClient,
  companyId: string,
  entryId: string,
  input: UpdateAccountsPayableInput,
  profileId: string,
): Promise<AccountsPayableEntry> {
  const existing = assertAccountsPayableEntry(
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
      entryType: 'expense',
      entryStatus: existing.entryStatus,
      description: input.description,
      referenceNumber: existing.referenceNumber,
      supplier: input.supplier,
      client: existing.client,
      amount: input.amount,
      currency: existing.currency || 'BRL',
      entryDate: input.entryDate,
      dueDate: input.dueDate,
      notes: input.notes,
    },
    profileId,
  );
}

export async function markAccountsPayablePaid(
  supabase: SupabaseClient,
  companyId: string,
  entryId: string,
  profileId: string,
  input: {paidAt: string; paidAmount: number},
): Promise<AccountsPayableEntry> {
  const existing = assertAccountsPayableEntry(
    await getFinancialEntryById(supabase, companyId, entryId),
  );

  if (existing.entryStatus === 'paid') {
    throw new Error('Conta já está paga.');
  }

  if (existing.entryStatus === 'cancelled') {
    throw new Error('Não é possível pagar uma conta cancelada.');
  }

  const paidAtIso = input.paidAt.includes('T')
    ? input.paidAt
    : `${input.paidAt}T12:00:00.000Z`;

  return markFinancialEntryPaid(supabase, companyId, entryId, profileId, {
    paidAt: paidAtIso,
    paidAmount: input.paidAmount,
  });
}

export async function cancelAccountsPayable(
  supabase: SupabaseClient,
  companyId: string,
  entryId: string,
  profileId: string,
): Promise<AccountsPayableEntry> {
  assertAccountsPayableEntry(await getFinancialEntryById(supabase, companyId, entryId));
  return cancelFinancialEntry(supabase, companyId, entryId, profileId);
}

export async function deleteAccountsPayable(
  supabase: SupabaseClient,
  companyId: string,
  entryId: string,
  profileId: string,
): Promise<void> {
  assertAccountsPayableEntry(await getFinancialEntryById(supabase, companyId, entryId));
  await softDeleteFinancialEntry(supabase, companyId, entryId, profileId);
}
