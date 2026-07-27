import {redirect} from 'next/navigation';

import {PageTemplate} from '@/components/layout/page-template';
import {OperationalDreView} from '@/features/dre/components';
import {
  getOperationalDreBundle,
  getOperationalDreFilterOptions,
} from '@/features/dre/loaders';
import type {
  OperationalDreByRouteData,
  OperationalDreData,
  OperationalDreFilterOptions,
} from '@/features/dre/types';
import {
  EMPTY_OPERATIONAL_DRE,
  EMPTY_OPERATIONAL_DRE_BY_ROUTE,
  EMPTY_OPERATIONAL_DRE_FILTER_OPTIONS,
} from '@/features/dre/utils/empty-state';
import {parseOperationalDreFilters} from '@/features/dre/utils/list-url';
import {
  getCurrentCompanyId,
  getServerSupabaseClient,
} from '@/lib/auth/company';
import {ROUTES} from '@/constants/routes/paths';

interface DashboardDrePageProps {
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

export default async function DashboardDrePage({
  searchParams,
}: DashboardDrePageProps) {
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    redirect(ROUTES.login);
  }

  const params = await searchParams;
  const dreFilters = parseOperationalDreFilters(params);

  let dreData: OperationalDreData = {
    ...EMPTY_OPERATIONAL_DRE,
    filters: dreFilters,
  };
  let dreByRoute: OperationalDreByRouteData = {
    ...EMPTY_OPERATIONAL_DRE_BY_ROUTE,
    filters: dreFilters,
  };
  let dreFilterOptions: OperationalDreFilterOptions =
    EMPTY_OPERATIONAL_DRE_FILTER_OPTIONS;
  let dreError: string | null = null;

  try {
    const [bundle, filterOptions] = await Promise.all([
      getOperationalDreBundle(supabase, companyId, dreFilters),
      getOperationalDreFilterOptions(supabase, companyId),
    ]);
    dreData = bundle.dre;
    dreByRoute = bundle.byRoute;
    dreFilterOptions = filterOptions;
  } catch (err) {
    dreError =
      err instanceof Error ? err.message : 'Erro ao carregar a DRE Operacional.';
  }

  return (
    <PageTemplate
      title="DRE Operacional"
      description="Receitas, custos, indicadores e análise por rota."
      breadcrumbItems={[
        {label: 'Dashboard', href: ROUTES.dashboard},
        {label: 'DRE'},
      ]}
    >
      <OperationalDreView
        data={dreData}
        byRoute={dreByRoute}
        filterOptions={dreFilterOptions}
        initialFilters={dreFilters}
        error={dreError}
      />
    </PageTemplate>
  );
}
