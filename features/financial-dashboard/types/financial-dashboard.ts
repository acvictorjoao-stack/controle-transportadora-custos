import type {CashFlowSummary, CashFlowType} from '@/features/cash-flow/types';
import type {FinancialEntryStatus} from '@/features/financial/types';

export interface FinancialDashboardOpenBucket {
  total: number;
  quantidade: number;
}

export interface FinancialDashboardPeriodTotals {
  mes: number;
  hoje: number;
}

export interface FinancialDashboardOverdue {
  aReceber: number;
  aPagar: number;
}

export interface FinancialDashboardResumo {
  totalRecebido: number;
  totalPago: number;
  resultado: number;
}

export interface FinancialDashboardUpcomingRow {
  id: string;
  dueDate: string | null;
  cashFlowType: CashFlowType;
  personName: string | null;
  amount: number;
  currency: string;
  entryStatus: FinancialEntryStatus;
}

export interface FinancialDashboardData {
  summary: CashFlowSummary;
  contasAReceber: FinancialDashboardOpenBucket;
  contasAPagar: FinancialDashboardOpenBucket;
  recebimentos: FinancialDashboardPeriodTotals;
  pagamentos: FinancialDashboardPeriodTotals;
  inadimplencia: FinancialDashboardOverdue;
  proximosVencimentos: FinancialDashboardUpcomingRow[];
  resumo: FinancialDashboardResumo;
}
