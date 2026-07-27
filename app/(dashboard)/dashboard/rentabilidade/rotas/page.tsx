import {redirect} from 'next/navigation';

import {PageTemplate} from '@/components/layout/page-template';
import {RouteProfitabilityView} from '@/features/dre/components';
import {
  getOperationalDreByRoute,
  getOperationalDreFilterOptions,
} from '@/features/dre/loaders';
import type {
  OperationalDreByRouteData,
  OperationalDreFilterOptions,
} from '@/features/dre/types';
import {
  EMPTY_OPERATIONAL_DRE_BY_ROUTE,
  EMPTY_OPERATIONAL_DRE_FILTER_OPTIONS,
} from '@/features/dre/utils/empty-state';
import {parseOperationalDreFilters} from '@/features/dre/utils/list-url';
import {
  getCurrentCompanyId,
  getServerSupabaseClient,
} from '@/lib/auth/company';
import {ROUTES} from '@/constants/routes/paths';

interface RouteProfitabilityPageProps {
  searchParams: Promise<{
    empresa?: string;
    cliente?: string;
    rota?: string;
    centro?: string;
    de?: string;
    ate?: string;
  }>;
}

export default async function RouteProfitabilityPage({
  searchParams,
}: RouteProfitabilityPageProps) {
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    redirect(ROUTES.login);
  }

  const params = await searchParams;
  const filters = parseOperationalDreFilters(params);

  let byRoute: OperationalDreByRouteData = {
    ...EMPTY_OPERATIONAL_DRE_BY_ROUTE,
    filters,
  };
  let filterOptions: OperationalDreFilterOptions =
    EMPTY_OPERATIONAL_DRE_FILTER_OPTIONS;
  let error: string | null = null;

  try {
    const [routeData, options] = await Promise.all([
      getOperationalDreByRoute(supabase, companyId, filters),
      getOperationalDreFilterOptions(supabase, companyId),
    ]);
    byRoute = routeData;
    filterOptions = options;
  } catch (err) {
    error =
      err instanceof Error
        ? err.message
        : 'Erro ao carregar a rentabilidade por rota.';
  }

  return (
    <PageTemplate
      title="Rentabilidade por Rota"
      description="Custos e margem por rota, com espaço para evoluções analíticas."
    >
      <RouteProfitabilityView
        byRoute={byRoute}
        filterOptions={filterOptions}
        initialFilters={filters}
        error={error}
      />
    </PageTemplate>
  );
}
