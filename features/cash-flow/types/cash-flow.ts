import type {FinancialEntry, FinancialEntryStatus} from '@/features/financial/types';

import type {CASH_FLOW_STATUSES, CASH_FLOW_TYPES} from '../constants';

export type CashFlowType = (typeof CASH_FLOW_TYPES)[number];
export type CashFlowStatus = (typeof CASH_FLOW_STATUSES)[number];

export interface CashFlowListFilters {
  cashFlowType?: CashFlowType;
  entryStatus?: CashFlowStatus;
  dateFrom?: string;
  dateTo?: string;
}

export interface CashFlowSummary {
  entradasRecebidas: number;
  saidasPagas: number;
  saldoAtual: number;
  aReceber: number;
  aPagar: number;
  saldoProjetado: number;
}

export interface CashFlowLine extends FinancialEntry {
  cashFlowType: CashFlowType;
  personName: string | null;
  movementDate: string;
  entrada: number | null;
  saida: number | null;
  signedAmount: number;
  runningBalance: number;
}

export interface PaginatedCashFlow {
  items: CashFlowLine[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type {FinancialEntryStatus};
