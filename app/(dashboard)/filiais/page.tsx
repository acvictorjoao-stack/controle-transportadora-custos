import {redirect} from 'next/navigation';

import {BranchesList} from '@/features/organization/branches/components';
import {listBranches} from '@/features/organization/branches/queries';
import {
  assertCompanyPermission,
  getCurrentCompanyId,
  getServerSupabaseClient,
} from '@/lib/auth/company';
import {ROUTES} from '@/constants/routes/paths';

interface FiliaisPageProps {
  searchParams: Promise<{q?: string; page?: string}>;
}

export default async function FiliaisPage({searchParams}: FiliaisPageProps) {
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    redirect(ROUTES.login);
  }

  const canRead = await assertCompanyPermission(supabase, companyId, 'branches:read');
  if (!canRead) {
    redirect(ROUTES.dashboard);
  }

  const params = await searchParams;
  const search = params.q ?? '';
  const page = Number(params.page ?? '1');

  let data;
  let error: string | null = null;

  try {
    data = await listBranches(supabase, {companyId, search, page});
  } catch (err) {
    error = err instanceof Error ? err.message : 'Erro ao carregar filiais.';
    data = {items: [], total: 0, page: 1, pageSize: 10, totalPages: 1};
  }

  return (
    <BranchesList
      initialData={data}
      initialSearch={search}
      initialPage={page}
      error={error}
    />
  );
}
