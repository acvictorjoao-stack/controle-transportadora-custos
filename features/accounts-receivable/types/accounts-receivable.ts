import type {
  FinancialCategory,
  FinancialCostCenter,
  FinancialDetailData,
  FinancialEntry,
  FinancialEntryStatus,
  FinancialHistory,
  PaginatedFinancialEntries,
} from '@/features/financial/types';

import type {ACCOUNTS_RECEIVABLE_STATUSES} from '../constants';

export type AccountsReceivableStatus = (typeof ACCOUNTS_RECEIVABLE_STATUSES)[number];

export type AccountsReceivableEntry = FinancialEntry;
export type AccountsReceivableHistory = FinancialHistory;
export type AccountsReceivableCategory = FinancialCategory;
export type AccountsReceivableCostCenter = FinancialCostCenter;

export interface AccountsReceivableListFilters {
  entryStatus?: AccountsReceivableStatus;
  categoryId?: string;
  client?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface AccountsReceivableSortOptions {
  sortBy?: 'due_date' | 'entry_date' | 'amount' | 'entry_status' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}

export type PaginatedAccountsReceivable = PaginatedFinancialEntries;

export interface AccountsReceivableDetailData {
  entry: AccountsReceivableEntry;
  history: AccountsReceivableHistory[];
}

export type {FinancialDetailData, FinancialEntryStatus};
