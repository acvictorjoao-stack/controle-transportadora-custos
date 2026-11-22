import type {
  ReconciliationCheckId,
  ReconciliationFinding,
  ReconciliationSummary,
} from '@/features/financial/consistency/reconciliation';

export interface ReconciliationPeriod {
  /** YYYY-MM-DD, inclusive. */
  dateFrom?: string;
  /** YYYY-MM-DD, inclusive. */
  dateTo?: string;
}

export interface FinancialReconciliationData {
  findings: ReconciliationFinding[];
  summary: ReconciliationSummary;
  period: ReconciliationPeriod;
  /** O que as comparações de relatório cobriram (nulo se falharam). */
  coverage: {tripsChecked: number; cashFlowLinesChecked: number} | null;
  /** Verificações do banco que bateram no limite de linhas: há mais achados que os listados. */
  truncatedChecks: ReconciliationCheckId[];
  /** Falhas parciais: uma fonte pode falhar sem esconder a outra. */
  errors: string[];
}

/** Contagem para o selo do Dashboard financeiro (sem legado). */
export interface ReconciliationAlertCounts {
  critical: number;
  high: number;
}
