import {redirect} from 'next/navigation';

import {SuppliersList} from '@/features/suppliers/components';
import {getSuppliersPage} from '@/features/suppliers/loaders';
import type {
  SupplierCategory,
  SupplierListFilters,
  SupplierSortOptions,
} from '@/features/suppliers/types';
import {
  assertCompanyPermission,
  getCurrentCompanyId,
  getServerSupabaseClient,
} from '@/lib/auth/company';
import {ROUTES} from '@/constants/routes/paths';

interface FornecedoresPageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
    category?: string;
    city?: string;
    state?: string;
    active?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

export default async function FornecedoresPage({searchParams}: FornecedoresPageProps) {
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    redirect(ROUTES.login);
  }

  const canRead = await assertCompanyPermission(supabase, companyId, 'suppliers:read');
  if (!canRead) {
    redirect(ROUTES.dashboard);
  }

  const params = await searchParams;
  const search = params.q ?? '';
  const page = Number(params.page ?? '1');

  const filters: SupplierListFilters = {
    category: params.category as SupplierCategory | undefined,
    city: params.city,
    state: params.state,
    active:
      params.active === '1' ? true : params.active === '0' ? false : undefined,
  };

  const sort: SupplierSortOptions = {
    sortBy: (params.sortBy as SupplierSortOptions['sortBy']) ?? 'corporate_name',
    sortOrder: (params.sortOrder as 'asc' | 'desc') ?? 'asc',
  };

  let data;
  let error: string | null = null;

  try {
    data = await getSuppliersPage(supabase, companyId, {search, page, filters, sort});
  } catch (err) {
    error = err instanceof Error ? err.message : 'Erro ao carregar fornecedores.';
    data = {items: [], total: 0, page: 1, pageSize: 10, totalPages: 1};
  }

  return (
    <SuppliersList
      initialData={data}
      initialSearch={search}
      initialFilters={filters}
      initialSort={sort}
      error={error}
    />
  );
}
