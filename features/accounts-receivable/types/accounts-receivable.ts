import type {
  FinancialCategory,
  FinancialCostCenter,
  FinancialDetailData,
  FinancialEntry,
  FinancialEntryStatus,
  FinancialHistory,
  PaginatedFinancialEntries,
} from '@/features/financial/types';

import type {
  ACCOUNTS_RECEIVABLE_STATUSES,
  RECEIVABLE_MOVEMENT_KIND_LABELS,
  RECEIVABLE_PAYMENT_METHODS,
} from '../constants';

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

export type ReceivablePaymentMethod = (typeof RECEIVABLE_PAYMENT_METHODS)[number];
export type ReceivableMovementKind = keyof typeof RECEIVABLE_MOVEMENT_KIND_LABELS;

export interface ReceivableMovement {
  id: string;
  kind: ReceivableMovementKind;
  amount: number;
  movementDate: string;
  paymentMethod: ReceivablePaymentMethod | null;
  notes: string | null;
  reason: string | null;
  reversesMovementId: string | null;
  createdAt: string;
  createdByName: string | null;
}

export interface AccountsReceivableDetailData {
  entry: AccountsReceivableEntry;
  history: AccountsReceivableHistory[];
  movements: ReceivableMovement[];
}

export type {FinancialDetailData, FinancialEntryStatus};
