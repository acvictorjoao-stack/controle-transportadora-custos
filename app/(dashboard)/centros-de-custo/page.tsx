import {redirect} from 'next/navigation';

import {CostCentersList} from '@/features/cost-centers/components';
import {getCostCentersPage} from '@/features/cost-centers/loaders';
import {
  assertCompanyPermission,
  getCurrentCompanyId,
  getServerSupabaseClient,
} from '@/lib/auth/company';
import {ROUTES} from '@/constants/routes/paths';

interface CentrosDeCustoPageProps {
  searchParams: Promise<{q?: string; page?: string}>;
}

export default async function CentrosDeCustoPage({
  searchParams,
}: CentrosDeCustoPageProps) {
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    redirect(ROUTES.login);
  }

  const canRead = await assertCompanyPermission(
    supabase,
    companyId,
    'financeiro:read',
  );
  if (!canRead) {
    redirect(ROUTES.dashboard);
  }

  const params = await searchParams;
  const search = params.q ?? '';
  const page = Number(params.page ?? '1');

  let data;
  let error: string | null = null;

  try {
    data = await getCostCentersPage(supabase, companyId, {search, page});
  } catch (err) {
    error =
      err instanceof Error ? err.message : 'Erro ao carregar centros de custo.';
    data = {items: [], total: 0, page: 1, pageSize: 10, totalPages: 1};
  }

  return (
    <CostCentersList
      initialData={data}
      initialSearch={search}
      error={error}
    />
  );
}
