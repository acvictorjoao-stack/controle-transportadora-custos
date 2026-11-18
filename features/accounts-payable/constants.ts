import {
  OPERATION_FINANCIAL_SOURCE_MODULES,
  PAYROLL_SOURCE_MODULE,
  TRIP_EXPENSE_SOURCE_MODULE,
} from '@/features/financial/constants/operation-financial';

export const ACCOUNTS_PAYABLE_SOURCE_MODULE = 'accounts_payable';

export const ACCOUNTS_PAYABLE_STATUSES = ['pending', 'paid', 'cancelled'] as const;

export const ACCOUNTS_PAYABLE_PAGE_SIZE = 10;

/**
 * Modules managed in Contas a Pagar (manual + operational credit + folha +
 * despesa da viagem: reembolso ao motorista/agregado e compra a prazo).
 */
export const ACCOUNTS_PAYABLE_MANAGED_SOURCE_MODULES = [
  ACCOUNTS_PAYABLE_SOURCE_MODULE,
  ...OPERATION_FINANCIAL_SOURCE_MODULES,
  PAYROLL_SOURCE_MODULE,
  TRIP_EXPENSE_SOURCE_MODULE,
] as const;

/** Lançamento integrado à despesa da viagem só muda pela despesa (migration 111). */
export const TRIP_EXPENSE_ORIGIN_ERROR =
  'Esta conta vem de uma despesa da viagem. Altere, cancele ou exclua a despesa na viagem.';
