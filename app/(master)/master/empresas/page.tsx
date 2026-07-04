import {EmpresasList} from '@/components/master/empresas';
import {PageTemplate} from '@/components/layout/page-template';
import {Section} from '@/components/layout/section';
import {listCompanies} from '@/features/master/companies/queries';
import type {
  CompanySortField,
  CompanySortOrder,
  EntityStatus,
  ProvisionStatus,
} from '@/features/master/companies/types';
import {getPlanCatalog} from '@/features/master/plans';
import {createClient} from '@/supabase/server';

interface MasterEmpresasPageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
    status?: string;
    provision?: string;
    plan?: string;
    sort?: string;
    order?: string;
  }>;
}

const VALID_STATUS = new Set(['active', 'inactive', 'blocked', 'archived']);
const VALID_PROVISION = new Set(['pending', 'in_progress', 'completed', 'error']);
const VALID_SORT = new Set(['created_at', 'legal_name', 'status']);

export default async function MasterEmpresasPage({
  searchParams,
}: MasterEmpresasPageProps) {
  const params = await searchParams;
  const search = params.q?.trim() ?? '';
  const page = Math.max(1, Number(params.page ?? '1') || 1);
  const status = VALID_STATUS.has(params.status ?? '')
    ? (params.status as EntityStatus)
    : undefined;
  const provisionStatus = VALID_PROVISION.has(params.provision ?? '')
    ? (params.provision as ProvisionStatus)
    : undefined;
  const planSlug = params.plan?.trim() || undefined;
  const sortBy = VALID_SORT.has(params.sort ?? '')
    ? (params.sort as CompanySortField)
    : 'created_at';
  const sortOrder: CompanySortOrder =
    params.order === 'asc' || params.order === 'desc' ? params.order : 'desc';

  let data = null;
  let plans = null;
  let error: string | null = null;

  try {
    const supabase = await createClient();
    [data, plans] = await Promise.all([
      listCompanies(supabase, {
        search,
        page,
        status,
        provisionStatus,
        planSlug,
        sortBy,
        sortOrder,
      }),
      getPlanCatalog(supabase),
    ]);
  } catch (fetchError) {
    error =
      fetchError instanceof Error
        ? fetchError.message
        : 'Erro ao carregar empresas.';
  }

  return (
    <PageTemplate
      title="Empresas"
      description="Gestão de empresas clientes da plataforma"
    >
      <Section>
        <EmpresasList
          key={`${search}-${page}-${status}-${provisionStatus}-${planSlug}-${sortBy}-${sortOrder}`}
          initialData={data}
          initialSearch={search}
          initialPage={page}
          initialStatus={status}
          initialProvisionStatus={provisionStatus}
          initialPlanSlug={planSlug}
          initialSortBy={sortBy}
          initialSortOrder={sortOrder}
          plans={plans ?? []}
          error={error}
        />
      </Section>
    </PageTemplate>
  );
}
