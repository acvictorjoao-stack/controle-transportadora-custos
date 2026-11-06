import type {FinancialEntry} from '../types';

type BalanceEntry = Pick<FinancialEntry, 'amount' | 'adjustmentTotal' | 'paidAmount'>;

/** Valor efetivo do título: original + ajustes rastreáveis. */
export function getReceivableEffectiveAmount(entry: BalanceEntry): number {
  return roundMoney(entry.amount + (entry.adjustmentTotal ?? 0));
}

/** Saldo em aberto do título. */
export function getReceivableBalance(entry: BalanceEntry): number {
  return roundMoney(getReceivableEffectiveAmount(entry) - (entry.paidAmount ?? 0));
}

export function isPartiallyReceived(
  entry: BalanceEntry & Pick<FinancialEntry, 'entryStatus'>,
): boolean {
  const open = entry.entryStatus === 'pending' || entry.entryStatus === 'overdue';
  return open && (entry.paidAmount ?? 0) > 0;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
