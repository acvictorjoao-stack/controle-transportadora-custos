import type {SupabaseClient} from '@supabase/supabase-js';

import {
  mapReconciliationFindingRow,
  sortReconciliationFindings,
  summarizeReconciliationFindings,
  type ReconciliationCheckId,
  type ReconciliationFinding,
  type ReconciliationFindingRow,
} from '@/features/financial/consistency/reconciliation';
import {loadReconciliationReport} from '@/features/financial/loaders/reconciliation-report-loader';
import {mapDatabaseError} from '@/features/master/companies/utils/database-error';

import type {
  FinancialReconciliationData,
  ReconciliationAlertCounts,
  ReconciliationPeriod,
} from './types';

/** Achados por verificação do banco listados na tela (a contagem do resumo é sem limite). */
export const RECONCILIATION_FINDINGS_LIMIT = 500;

function reasonOf(result: PromiseRejectedResult): string {
  return result.reason instanceof Error ? result.reason.message : String(result.reason);
}

/**
 * Achados do banco (migration 113) e das comparações de relatório (R11–R13),
 * com a RLS de quem consulta. Uma fonte que falha não esconde a outra.
 */
export async function getFinancialReconciliationData(
  supabase: SupabaseClient,
  companyId: string,
  period: ReconciliationPeriod,
): Promise<FinancialReconciliationData> {
  const [database, report] = await Promise.allSettled([
    supabase
      .rpc('financial_reconciliation_findings', {
        p_company_id: companyId,
        p_from: period.dateFrom,
        p_to: period.dateTo,
        p_limit: RECONCILIATION_FINDINGS_LIMIT,
      })
      .then(({data, error}) => {
        if (error) throw new Error(mapDatabaseError(error));
        return ((data ?? []) as ReconciliationFindingRow[]).map(mapReconciliationFindingRow);
      }),
    loadReconciliationReport(supabase, companyId, period),
  ]);

  const errors: string[] = [];
  const findings: ReconciliationFinding[] = [];
  let truncatedChecks: ReconciliationCheckId[] = [];
  let coverage: FinancialReconciliationData['coverage'] = null;

  if (database.status === 'fulfilled') {
    findings.push(...database.value);
    const perCheck = new Map<ReconciliationCheckId, number>();
    for (const finding of database.value) {
      perCheck.set(finding.checkId, (perCheck.get(finding.checkId) ?? 0) + 1);
    }
    truncatedChecks = [...perCheck]
      .filter(([, count]) => count >= RECONCILIATION_FINDINGS_LIMIT)
      .map(([checkId]) => checkId);
  } else {
    errors.push(`Verificações do banco indisponíveis: ${reasonOf(database)}`);
  }

  if (report.status === 'fulfilled') {
    findings.push(...report.value.findings);
    coverage = {
      tripsChecked: report.value.scope.tripsChecked,
      cashFlowLinesChecked: report.value.scope.cashFlowLinesChecked,
    };
  } else {
    errors.push(`Comparações de relatório indisponíveis: ${reasonOf(report)}`);
  }

  const sorted = sortReconciliationFindings(findings);
  return {
    findings: sorted,
    summary: summarizeReconciliationFindings(sorted),
    period,
    coverage,
    truncatedChecks,
    errors,
  };
}

/**
 * Selo do Dashboard financeiro: só o resumo do banco (barato, sem as
 * comparações de relatório). Falha silenciosa: o selo é um atalho, não a tela.
 */
export async function getReconciliationAlertCounts(
  supabase: SupabaseClient,
  companyId: string,
): Promise<ReconciliationAlertCounts | null> {
  const {data, error} = await supabase.rpc('financial_reconciliation_summary', {
    p_company_id: companyId,
  });
  if (error || !data) return null;

  const counts: ReconciliationAlertCounts = {critical: 0, high: 0};
  for (const row of data as Array<{severity: string; findings: number; legacy_findings: number}>) {
    const current = Number(row.findings) - Number(row.legacy_findings);
    if (row.severity === 'critical') counts.critical += current;
    if (row.severity === 'high') counts.high += current;
  }
  return counts;
}
