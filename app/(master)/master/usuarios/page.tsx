import {PageTemplate} from '@/components/layout/page-template';
import {Section} from '@/components/layout/section';
import {PortalUsersList} from '@/features/master/users/components/portal-users-list';
import {listPortalUsers} from '@/features/master/users/queries';
import type {PortalUserRoleFilter, PortalUserStatusFilter} from '@/features/master/users/types';
import {PORTAL_ROLES} from '@/lib/auth/permissions';
import {createClient} from '@/supabase/server';

interface MasterUsuariosPageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
    role?: string;
    status?: string;
  }>;
}

const VALID_ROLES = new Set(Object.values(PORTAL_ROLES));
const VALID_STATUS = new Set(['active', 'inactive']);

export default async function MasterUsuariosPage({
  searchParams,
}: MasterUsuariosPageProps) {
  const params = await searchParams;
  const search = params.q?.trim() ?? '';
  const page = Math.max(1, Number(params.page ?? '1') || 1);
  const role: PortalUserRoleFilter = VALID_ROLES.has(
    params.role as (typeof PORTAL_ROLES)[keyof typeof PORTAL_ROLES],
  )
    ? (params.role as PortalUserRoleFilter)
    : 'all';
  const status: PortalUserStatusFilter = VALID_STATUS.has(params.status ?? '')
    ? (params.status as PortalUserStatusFilter)
    : 'all';

  let data = null;
  let error: string | null = null;

  try {
    const supabase = await createClient();
    data = await listPortalUsers(supabase, {search, page, role, status});
  } catch (fetchError) {
    error =
      fetchError instanceof Error
        ? fetchError.message
        : 'Erro ao carregar usuários.';
  }

  return (
    <PageTemplate
      title="Usuários"
      description="Gestão de usuários da plataforma"
    >
      <Section>
        <PortalUsersList
          key={`${search}-${page}-${role}-${status}`}
          initialData={data}
          initialSearch={search}
          initialPage={page}
          initialRole={role}
          initialStatus={status}
          error={error}
        />
      </Section>
    </PageTemplate>
  );
}
