import {ACCOUNTS_PAYABLE_SOURCE_MODULE} from '@/features/accounts-payable/constants';
import {ACCOUNTS_RECEIVABLE_SOURCE_MODULE} from '@/features/accounts-receivable/constants';
import type {FinancialEntry} from '@/features/financial/types';

import type {CashFlowLine, CashFlowType} from '../types';

export function getCashFlowType(entry: FinancialEntry): CashFlowType | null {
  if (entry.sourceModule === ACCOUNTS_RECEIVABLE_SOURCE_MODULE || entry.entryType === 'revenue') {
    return 'recebimento';
  }
  if (entry.sourceModule === ACCOUNTS_PAYABLE_SOURCE_MODULE || entry.entryType === 'expense') {
    return 'pagamento';
  }
  return null;
}

export function getCashFlowPerson(entry: FinancialEntry): string | null {
  const type = getCashFlowType(entry);
  if (type === 'recebimento') {
    return entry.client ?? entry.customerName ?? null;
  }
  if (type === 'pagamento') {
    return entry.supplier ?? null;
  }
  return entry.client ?? entry.supplier ?? entry.customerName ?? null;
}

export function getCashFlowMovementDate(entry: FinancialEntry): string {
  if (entry.entryStatus === 'paid' && entry.paidAt) {
    return entry.paidAt.slice(0, 10);
  }
  return entry.dueDate ?? entry.entryDate;
}

export function getCashFlowAmount(entry: FinancialEntry): number {
  if (entry.entryStatus === 'paid' && entry.paidAmount != null) {
    return Number(entry.paidAmount);
  }
  return Number(entry.amount);
}

export function getCashFlowSignedAmount(entry: FinancialEntry): number {
  const type = getCashFlowType(entry);
  const amount = getCashFlowAmount(entry);
  if (type === 'recebimento') return amount;
  if (type === 'pagamento') return -amount;
  return 0;
}

export function mapCashFlowLine(
  entry: FinancialEntry,
  runningBalance: number,
): CashFlowLine {
  const cashFlowType = getCashFlowType(entry) ?? 'pagamento';
  const amount = getCashFlowAmount(entry);
  const signedAmount = getCashFlowSignedAmount(entry);

  return {
    ...entry,
    cashFlowType,
    personName: getCashFlowPerson(entry),
    movementDate: getCashFlowMovementDate(entry),
    entrada: cashFlowType === 'recebimento' ? amount : null,
    saida: cashFlowType === 'pagamento' ? amount : null,
    signedAmount,
    runningBalance,
  };
}
