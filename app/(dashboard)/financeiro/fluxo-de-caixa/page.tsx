import {redirect} from 'next/navigation';

import {CashFlowList} from '@/features/cash-flow/components';
import {getCashFlowSummary, listCashFlow} from '@/features/cash-flow/queries';
import type {
  CashFlowListFilters,
  CashFlowStatus,
  CashFlowSummary,
  CashFlowType,
  PaginatedCashFlow,
} from '@/features/cash-flow/types';
import {
  assertCompanyPermission,
  getCurrentCompanyId,
  getServerSupabaseClient,
} from '@/lib/auth/company';
import {ROUTES} from '@/constants/routes/paths';

interface FluxoDeCaixaPageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
    type?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}

export default async function FluxoDeCaixaPage({searchParams}: FluxoDeCaixaPageProps) {
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    redirect(ROUTES.login);
  }

  const canRead =
    (await assertCompanyPermission(supabase, companyId, 'financeiro_fluxo:read')) ||
    (await assertCompanyPermission(supabase, companyId, 'financeiro:read'));

  if (!canRead) {
    redirect(ROUTES.dashboard);
  }

  const params = await searchParams;
  const search = params.q ?? '';
  const page = Number(params.page ?? '1');

  const filters: CashFlowListFilters = {
    cashFlowType: params.type as CashFlowType | undefined,
    entryStatus: params.status as CashFlowStatus | undefined,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  };

  let data: PaginatedCashFlow;
  let summary: CashFlowSummary;
  let error: string | null = null;

  try {
    const [entries, summaryData] = await Promise.all([
      listCashFlow(supabase, {companyId, search, page, filters}),
      getCashFlowSummary(supabase, companyId, {
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      }),
    ]);

    data = entries;
    summary = summaryData;
  } catch (err) {
    error = err instanceof Error ? err.message : 'Erro ao carregar fluxo de caixa.';
    data = {items: [], total: 0, page: 1, pageSize: 10, totalPages: 1};
    summary = {
      entradasRecebidas: 0,
      saidasPagas: 0,
      saldoAtual: 0,
      aReceber: 0,
      aPagar: 0,
      saldoProjetado: 0,
    };
  }

  return (
    <CashFlowList
      initialData={data}
      summary={summary}
      initialSearch={search}
      initialFilters={filters}
      error={error}
    />
  );
}
