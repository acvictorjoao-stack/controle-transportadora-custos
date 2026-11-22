import {redirect} from 'next/navigation';

import {ROUTES} from '@/constants/routes/paths';
import {FinancialDashboardView} from '@/features/financial-dashboard/components';
import {getFinancialDashboardData} from '@/features/financial-dashboard/queries';
import type {FinancialDashboardData} from '@/features/financial-dashboard/types';
import {getReconciliationAlertCounts} from '@/features/financial-reconciliation/loaders';
import type {ReconciliationAlertCounts} from '@/features/financial-reconciliation/types';
import {
  assertCompanyPermission,
  getCurrentCompanyId,
  getServerSupabaseClient,
} from '@/lib/auth/company';

const EMPTY_DATA: FinancialDashboardData = {
  summary: {
    entradasRecebidas: 0,
    saidasPagas: 0,
    saldoAtual: 0,
    aReceber: 0,
    aPagar: 0,
    saldoProjetado: 0,
  },
  contasAReceber: {total: 0, quantidade: 0},
  contasAPagar: {total: 0, quantidade: 0},
  recebimentos: {mes: 0, hoje: 0},
  pagamentos: {mes: 0, hoje: 0},
  inadimplencia: {aReceber: 0, aPagar: 0},
  proximosVencimentos: [],
  resumo: {totalRecebido: 0, totalPago: 0, resultado: 0},
};

export default async function FinanceiroDashboardPage() {
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    redirect(ROUTES.login);
  }

  const canReadResults = await Promise.all([
    assertCompanyPermission(supabase, companyId, 'financeiro:read'),
    assertCompanyPermission(supabase, companyId, 'financeiro_fluxo:read'),
    assertCompanyPermission(supabase, companyId, 'financeiro_pagar:read'),
    assertCompanyPermission(supabase, companyId, 'financeiro_receber:read'),
  ]);
  const canRead = canReadResults.some(Boolean);

  if (!canRead) {
    redirect(ROUTES.dashboard);
  }

  let data: FinancialDashboardData = EMPTY_DATA;
  let error: string | null = null;
  // Selo da conciliação: só para quem tem financeiro:read (regra das funções da 113).
  const reconciliationPromise: Promise<ReconciliationAlertCounts | null> = canReadResults[0]
    ? getReconciliationAlertCounts(supabase, companyId).catch(() => null)
    : Promise.resolve(null);

  try {
    data = await getFinancialDashboardData(supabase, companyId);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Erro ao carregar dashboard financeiro.';
  }

  const reconciliation = await reconciliationPromise;

  return <FinancialDashboardView data={data} error={error} reconciliation={reconciliation} />;
}
