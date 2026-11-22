import {redirect} from 'next/navigation';

import {ROUTES} from '@/constants/routes/paths';
import {summarizeReconciliationFindings} from '@/features/financial/consistency/reconciliation';
import {ReconciliationPage} from '@/features/financial-reconciliation/components';
import {getFinancialReconciliationData} from '@/features/financial-reconciliation/loaders';
import type {FinancialReconciliationData} from '@/features/financial-reconciliation/types';
import {parseReconciliationPeriod} from '@/features/financial-reconciliation/utils/format';
import {
  assertCompanyPermission,
  getCurrentCompanyId,
  getServerSupabaseClient,
} from '@/lib/auth/company';

interface ConciliacaoPageProps {
  searchParams: Promise<{dateFrom?: string; dateTo?: string}>;
}

export default async function ConciliacaoFinanceiraPage({searchParams}: ConciliacaoPageProps) {
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    redirect(ROUTES.login);
  }

  // As funções da migration 113 exigem financeiro:read; a tela segue a mesma regra.
  const canRead = await assertCompanyPermission(supabase, companyId, 'financeiro:read');
  if (!canRead) {
    redirect(ROUTES.dashboard);
  }

  const {period, error: periodError} = parseReconciliationPeriod(await searchParams);

  let data: FinancialReconciliationData;
  let error: string | null = periodError;

  try {
    data = await getFinancialReconciliationData(supabase, companyId, period);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Erro ao carregar a conciliação financeira.';
    data = {
      findings: [],
      summary: summarizeReconciliationFindings([]),
      period,
      coverage: null,
      truncatedChecks: [],
      errors: [],
    };
  }

  return <ReconciliationPage data={data} error={error} />;
}
