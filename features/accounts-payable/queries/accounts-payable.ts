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
import {OPERATIONAL_EXPENSE_CATEGORY_SLUGS} from '@/features/financial/constants/operation-financial';

import {
  ACCOUNTS_PAYABLE_PAGE_SIZE,
  ACCOUNTS_PAYABLE_SOURCE_MODULE,
  ACCOUNTS_PAYABLE_MANAGED_SOURCE_MODULES,
} from '../constants';
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
import {
  isAccountsPayableManagedEntry,
  isManualAccountsPayableEntry,
} from '../utils/origin';

function assertAccountsPayableEntry(entry: FinancialEntry | null): AccountsPayableEntry {
  if (!entry || !isAccountsPayableManagedEntry(entry)) {
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
      sourceModules: [...ACCOUNTS_PAYABLE_MANAGED_SOURCE_MODULES],
      entryType: 'expense',
      entryStatus: options.filters?.entryStatus,
      categoryId: options.filters?.categoryId,
      supplier: options.filters?.supplier,
      dueDateFrom: options.filters?.dueDateFrom,
      dueDateTo: options.filters?.dueDateTo,
      dateFrom: options.filters?.dateFrom,
      dateTo: options.filters?.dateTo,
      // À vista (cash) ops have null due_date and stay out of Contas a Pagar.
      hasDueDate: true,
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
  if (!entry || !isAccountsPayableManagedEntry(entry)) {
    return null;
  }
  // Credit ops appear in AP; cash-only system entries without due date are ledger-only.
  if (entry.sourceModule !== ACCOUNTS_PAYABLE_SOURCE_MODULE && !entry.dueDate) {
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
  if (!detail || !isAccountsPayableManagedEntry(detail.entry)) {
    return null;
  }
  if (detail.entry.sourceModule !== ACCOUNTS_PAYABLE_SOURCE_MODULE && !detail.entry.dueDate) {
    return null;
  }

  const history = await listFinancialHistory(supabase, companyId, entryId);
  return {entry: detail.entry, history};
}

async function assertManualCategoryAllowed(
  supabase: SupabaseClient,
  companyId: string,
  categoryId: string,
): Promise<void> {
  const {data} = await supabase
    .from('financial_categories')
    .select('slug')
    .eq('id', categoryId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .maybeSingle();

  const slug = data?.slug ?? null;
  if (
    slug &&
    OPERATIONAL_EXPENSE_CATEGORY_SLUGS.includes(
      slug as (typeof OPERATIONAL_EXPENSE_CATEGORY_SLUGS)[number],
    )
  ) {
    throw new Error(
      'Esta categoria deve ser lançada pelo módulo operacional correspondente (Abastecimentos, Manutenções, Pneus, Multas ou Pedágios).',
    );
  }
}

export async function createAccountsPayable(
  supabase: SupabaseClient,
  companyId: string,
  input: CreateAccountsPayableInput,
  profileId: string,
): Promise<AccountsPayableEntry> {
  await assertManualCategoryAllowed(supabase, companyId, input.categoryId);

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

  if (!isManualAccountsPayableEntry(existing)) {
    throw new Error(
      'Contas originadas de módulos operacionais devem ser alteradas na origem.',
    );
  }

  if (existing.entryStatus === 'cancelled') {
    throw new Error('Não é possível editar uma conta cancelada.');
  }

  await assertManualCategoryAllowed(supabase, companyId, input.categoryId);

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
