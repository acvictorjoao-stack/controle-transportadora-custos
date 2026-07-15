import type {
  FinancialCategory,
  FinancialCostCenter,
  FinancialDetailData,
  FinancialEntry,
  FinancialEntryStatus,
  FinancialHistory,
  PaginatedFinancialEntries,
} from '@/features/financial/types';

import type {ACCOUNTS_PAYABLE_STATUSES} from '../constants';

export type AccountsPayableStatus = (typeof ACCOUNTS_PAYABLE_STATUSES)[number];

export type AccountsPayableEntry = FinancialEntry;
export type AccountsPayableHistory = FinancialHistory;
export type AccountsPayableCategory = FinancialCategory;
export type AccountsPayableCostCenter = FinancialCostCenter;

export interface AccountsPayableListFilters {
  entryStatus?: AccountsPayableStatus;
  categoryId?: string;
  supplier?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface AccountsPayableSortOptions {
  sortBy?: 'due_date' | 'entry_date' | 'amount' | 'entry_status' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}

export type PaginatedAccountsPayable = PaginatedFinancialEntries;

export interface AccountsPayableDetailData {
  entry: AccountsPayableEntry;
  history: AccountsPayableHistory[];
}

export type {FinancialDetailData, FinancialEntryStatus};
