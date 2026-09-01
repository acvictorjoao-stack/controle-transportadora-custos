import {redirect} from 'next/navigation';

import {PositionsList} from '@/features/payroll/components/positions-list';
import {getPositionsPage} from '@/features/payroll/loaders';
import {
  assertCompanyPermission,
  getCurrentCompanyId,
  getServerSupabaseClient,
} from '@/lib/auth/company';
import {ROUTES} from '@/constants/routes/paths';

interface CargosPageProps {
  searchParams: Promise<{q?: string; page?: string}>;
}

export default async function CargosPage({searchParams}: CargosPageProps) {
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    redirect(ROUTES.login);
  }

  const canRead = await assertCompanyPermission(supabase, companyId, 'financeiro:read');
  if (!canRead) {
    redirect(ROUTES.dashboard);
  }

  const params = await searchParams;
  const search = params.q ?? '';
  const page = Number(params.page ?? '1');

  let data;
  let error: string | null = null;

  try {
    data = await getPositionsPage(supabase, companyId, {search, page});
  } catch (err) {
    error = err instanceof Error ? err.message : 'Erro ao carregar cargos.';
    data = {items: [], total: 0, page: 1, pageSize: 10, totalPages: 1};
  }

  return <PositionsList initialData={data} initialSearch={search} error={error} />;
}
