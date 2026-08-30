import {
  OPERATION_FINANCIAL_SOURCE_MODULES,
  PAYROLL_SOURCE_MODULE,
} from '@/features/financial/constants/operation-financial';

export const ACCOUNTS_PAYABLE_SOURCE_MODULE = 'accounts_payable';

export const ACCOUNTS_PAYABLE_STATUSES = ['pending', 'paid', 'cancelled'] as const;

export const ACCOUNTS_PAYABLE_PAGE_SIZE = 10;

/** Modules managed in Contas a Pagar (manual + operational credit + folha). */
export const ACCOUNTS_PAYABLE_MANAGED_SOURCE_MODULES = [
  ACCOUNTS_PAYABLE_SOURCE_MODULE,
  ...OPERATION_FINANCIAL_SOURCE_MODULES,
  PAYROLL_SOURCE_MODULE,
] as const;
