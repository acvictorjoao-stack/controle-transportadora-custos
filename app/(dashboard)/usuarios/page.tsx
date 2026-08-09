import {redirect} from 'next/navigation';

import {MembersList} from '@/features/organization/members/components';
import {listCompanyMembers} from '@/features/organization/members/queries';
import type {MemberStatusFilter} from '@/features/organization/members/types';
import {
  assertCompanyPermission,
  getCurrentCompanyId,
  getCurrentUserId,
  getServerSupabaseClient,
} from '@/lib/auth/company';
import {ROUTES} from '@/constants/routes/paths';

interface UsuariosPageProps {
  searchParams: Promise<{q?: string; page?: string; status?: string}>;
}

function parseStatusFilter(value: string | undefined): MemberStatusFilter {
  if (value === 'active' || value === 'inactive') return value;
  return 'all';
}

/**
 * Gestão de usuários da EMPRESA autenticada (tenant).
 * company_id vem exclusivamente da sessão/membership — nunca do client.
 */
export default async function UsuariosPage({searchParams}: UsuariosPageProps) {
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    redirect(ROUTES.login);
  }

  const canRead = await assertCompanyPermission(supabase, companyId, 'members:read');
  if (!canRead) {
    redirect(ROUTES.dashboard);
  }

  const canManage =
    (await assertCompanyPermission(supabase, companyId, 'members:write')) ||
    (await assertCompanyPermission(supabase, companyId, 'members:invite'));

  const params = await searchParams;
  const search = params.q ?? '';
  const page = Number(params.page ?? '1');
  const status = parseStatusFilter(params.status);
  const currentProfileId = await getCurrentUserId(supabase);

  let data;
  let error: string | null = null;

  try {
    // Admin client only after members:read; always scoped by session companyId.
    data = await listCompanyMembers(supabase, {
      companyId,
      search,
      page,
      status,
      useAdminClient: true,
    });
  } catch (err) {
    error = err instanceof Error ? err.message : 'Erro ao carregar usuários.';
    data = {items: [], total: 0, page: 1, pageSize: 20, totalPages: 1};
  }

  return (
    <MembersList
      initialData={data}
      initialSearch={search}
      initialStatus={status}
      currentProfileId={currentProfileId}
      canManage={canManage}
      error={error}
    />
  );
}
