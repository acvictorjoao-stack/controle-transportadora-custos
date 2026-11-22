import {redirect} from 'next/navigation';

import {ROUTES} from '@/constants/routes/paths';
import {TripProfitabilityPageView} from '@/features/dre/components/trip-profitability-page-view';
import {getOperationalDreFilterOptions, getOperationalDreTripProfitability} from '@/features/dre/loaders';
import {summarizeTripProfitability} from '@/features/dre/services/operational-dre-trip-profitability';
import type {TripProfitabilityPageViewProps} from '@/features/dre/components/trip-profitability-page-view';
import {EMPTY_OPERATIONAL_DRE_FILTER_OPTIONS} from '@/features/dre/utils/empty-state';
import {parseOperationalDreFilters} from '@/features/dre/utils/list-url';
import {currentMonthFilters} from '@/features/organization/dashboard/utils/period';
import {
  assertCompanyPermission,
  getCurrentCompanyId,
  getServerSupabaseClient,
} from '@/lib/auth/company';

interface TripProfitabilityPageProps {
  searchParams: Promise<{
    empresa?: string;
    filial?: string;
    cliente?: string;
    rota?: string;
    veiculo?: string;
    motorista?: string;
    centro?: string;
    de?: string;
    ate?: string;
    periodo?: string;
  }>;
}

export default async function TripProfitabilityPage({searchParams}: TripProfitabilityPageProps) {
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    redirect(ROUTES.login);
  }

  // Mesma regra das outras telas de rentabilidade: despesas exigem financeiro:read.
  const canRead = await assertCompanyPermission(supabase, companyId, 'financeiro:read');
  if (!canRead) {
    redirect(ROUTES.dashboard);
  }

  const parsed = parseOperationalDreFilters(await searchParams);
  const fallback = currentMonthFilters();
  const filters = {
    ...parsed,
    dateFrom: parsed.dateFrom ?? fallback.dateFrom,
    dateTo: parsed.dateTo ?? fallback.dateTo,
  };

  let props: TripProfitabilityPageViewProps = {
    rows: [],
    summary: summarizeTripProfitability([]),
    costs: {totalOperatingCosts: 0, allocatedOperatingCosts: 0, unattributableOperatingCosts: 0},
    filterOptions: EMPTY_OPERATIONAL_DRE_FILTER_OPTIONS,
    initialFilters: filters,
    error: null,
  };

  try {
    const [data, filterOptions] = await Promise.all([
      getOperationalDreTripProfitability(supabase, companyId, filters),
      getOperationalDreFilterOptions(supabase, companyId).catch(() => EMPTY_OPERATIONAL_DRE_FILTER_OPTIONS),
    ]);
    props = {
      ...props,
      rows: data.rows,
      summary: data.summary,
      costs: data.dre.costs,
      filterOptions,
    };
  } catch (err) {
    props.error = err instanceof Error ? err.message : 'Erro ao carregar a rentabilidade por viagem.';
  }

  return <TripProfitabilityPageView {...props} />;
}
