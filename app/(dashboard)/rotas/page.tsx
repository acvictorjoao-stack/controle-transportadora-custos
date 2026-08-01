import {redirect} from 'next/navigation';

import {ROUTES} from '@/constants/routes/paths';
import {listCustomersForSelect} from '@/features/customers/queries';
import {listBranchesForSelect} from '@/features/organization/branches/queries';
import {RoutesList} from '@/features/routes/components';
import {listRouteFilterOptions, listRoutes} from '@/features/routes/queries';
import type {
  RouteFilterOptions,
  RouteListFilters,
  RouteOperationalStatus,
  RouteSortOptions,
  RouteType,
} from '@/features/routes/types';
import {
  assertCompanyPermission,
  getCurrentCompanyId,
  getServerSupabaseClient,
} from '@/lib/auth/company';

interface RotasPageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
    status?: string;
    type?: string;
    origin?: string;
    destination?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

export default async function RotasPage({searchParams}: RotasPageProps) {
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    redirect(ROUTES.login);
  }

  const canRead = await assertCompanyPermission(supabase, companyId, 'routes:read');
  if (!canRead) {
    redirect(ROUTES.dashboard);
  }

  const params = await searchParams;
  const search = params.q ?? '';
  const page = Number(params.page ?? '1');

  const filters: RouteListFilters = {
    operationalStatus: params.status as RouteOperationalStatus | undefined,
    routeType: params.type as RouteType | undefined,
    origin: params.origin,
    destination: params.destination,
  };

  const sort: RouteSortOptions = {
    sortBy: (params.sortBy as RouteSortOptions['sortBy']) ?? 'name',
    sortOrder: (params.sortOrder as 'asc' | 'desc') ?? 'asc',
  };

  let data;
  let filterOptions: RouteFilterOptions;
  let customers: {id: string; label: string}[] = [];
  let branches: {id: string; label: string}[] = [];
  let error: string | null = null;

  try {
    const [routesData, routeFilters, customerRows, branchRows] = await Promise.all([
      listRoutes(supabase, {companyId, search, page, filters, sort}),
      listRouteFilterOptions(supabase, companyId),
      listCustomersForSelect(supabase, companyId),
      listBranchesForSelect(supabase, companyId),
    ]);
    data = routesData;
    filterOptions = routeFilters;
    customers = customerRows.map((customer) => ({
      id: customer.id,
      label: customer.displayName,
    }));
    branches = branchRows.map((branch) => ({
      id: branch.id,
      label: branch.name,
    }));
  } catch (err) {
    error = err instanceof Error ? err.message : 'Erro ao carregar rotas.';
    data = {items: [], total: 0, page: 1, pageSize: 10, totalPages: 1};
    filterOptions = {origins: [], destinations: []};
  }

  return (
    <RoutesList
      initialData={data}
      initialSearch={search}
      initialFilters={filters}
      initialSort={sort}
      filterOptions={filterOptions}
      customers={customers}
      branches={branches}
      error={error}
    />
  );
}
