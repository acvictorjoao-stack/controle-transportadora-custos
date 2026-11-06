import {ACCOUNTS_PAYABLE_SOURCE_MODULE} from '@/features/accounts-payable/constants';
import {ACCOUNTS_RECEIVABLE_SOURCE_MODULE} from '@/features/accounts-receivable/constants';
import type {FinancialEntry} from '@/features/financial/types';
import {getReceivableBalance} from '@/features/financial/utils/receivable-balance';

import type {CashFlowLine, CashFlowLineData, CashFlowType} from '../types';

type CashFlowTypeInput = {
  sourceModule: FinancialEntry['sourceModule'];
  entryType: FinancialEntry['entryType'];
};

export function getCashFlowType(entry: CashFlowTypeInput): CashFlowType | null {
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

/** Valor do lançamento: pago quando quitado; saldo em aberto nos demais casos. */
export function getCashFlowAmount(entry: FinancialEntry): number {
  if (entry.entryStatus === 'paid' && entry.paidAmount != null) {
    return Number(entry.paidAmount);
  }
  return getReceivableBalance(entry);
}

/** Valor com sinal: estorno de recebimento chega negativo e reduz a entrada. */
export function getCashFlowSignedLineAmount(
  type: CashFlowType | null,
  lineAmount: number,
): number {
  if (type === 'recebimento') return lineAmount;
  if (type === 'pagamento') return -lineAmount;
  return 0;
}

export function mapCashFlowLine(
  entry: FinancialEntry,
  line: CashFlowLineData,
  runningBalance: number,
): CashFlowLine {
  const cashFlowType = getCashFlowType(entry) ?? 'pagamento';
  const signedAmount = getCashFlowSignedLineAmount(cashFlowType, line.amount);

  return {
    ...entry,
    entryStatus: line.status,
    lineId: line.lineId,
    cashFlowType,
    personName: getCashFlowPerson(entry),
    movementDate: line.movementDate,
    entrada: signedAmount >= 0 ? signedAmount : null,
    saida: signedAmount < 0 ? Math.abs(signedAmount) : null,
    signedAmount,
    runningBalance,
  };
}
