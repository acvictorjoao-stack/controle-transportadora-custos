import {OPERATION_FINANCIAL_SOURCE_MODULES} from '@/features/financial/constants/operation-financial';

export const ACCOUNTS_PAYABLE_SOURCE_MODULE = 'accounts_payable';

export const ACCOUNTS_PAYABLE_STATUSES = ['pending', 'paid', 'cancelled'] as const;

export const ACCOUNTS_PAYABLE_PAGE_SIZE = 10;

/** Modules managed in Contas a Pagar (manual + operational credit). */
export const ACCOUNTS_PAYABLE_MANAGED_SOURCE_MODULES = [
  ACCOUNTS_PAYABLE_SOURCE_MODULE,
  ...OPERATION_FINANCIAL_SOURCE_MODULES,
] as const;
