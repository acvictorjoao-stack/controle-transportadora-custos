'use client';

import {ChevronLeft, ChevronRight, Plus} from 'lucide-react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import * as React from 'react';

import {DataTable} from '@/components/data-display/data-table';
import {TableContainer} from '@/components/data-display/table-container';
import {SearchInput} from '@/components/forms/search-input';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {ROUTES} from '@/constants/routes/paths';
import {
  ENTITY_STATUS_LABELS,
  PROVISION_STATUS_LABELS,
} from '@/features/master/companies/constants';
import {
  formatCompanyTaxIdDisplay,
} from '@/features/master/companies/services';
import type {
  CompanyListItem,
  CompanySortField,
  CompanySortOrder,
  EntityStatus,
  PaginatedCompanies,
  ProvisionStatus,
} from '@/features/master/companies/types';
import {getPlanLabel, type PlanCatalogItem} from '@/features/master/plans';

import {NovaEmpresaModal} from './nova-empresa-modal';

export interface EmpresasListProps {
  initialData: PaginatedCompanies | null;
  initialSearch: string;
  initialPage: number;
  initialStatus?: EntityStatus;
  initialProvisionStatus?: ProvisionStatus;
  initialPlanSlug?: string;
  initialSortBy: CompanySortField;
  initialSortOrder: CompanySortOrder;
  plans: PlanCatalogItem[];
  error: string | null;
}

function getStatusVariant(status: EntityStatus) {
  switch (status) {
    case 'active':
      return 'success' as const;
    case 'inactive':
      return 'warning' as const;
    case 'blocked':
      return 'destructive' as const;
    default:
      return 'secondary' as const;
  }
}

function getProvisionVariant(status: ProvisionStatus) {
  switch (status) {
    case 'completed':
      return 'success' as const;
    case 'in_progress':
      return 'info' as const;
    case 'error':
      return 'destructive' as const;
    default:
      return 'secondary' as const;
  }
}

function buildListUrl(options: {
  search: string;
  page: number;
  status?: EntityStatus;
  provisionStatus?: ProvisionStatus;
  planSlug?: string;
  sortBy: CompanySortField;
  sortOrder: CompanySortOrder;
}): string {
  const params = new URLSearchParams();
  if (options.search.trim()) params.set('q', options.search.trim());
  if (options.page > 1) params.set('page', String(options.page));
  if (options.status) params.set('status', options.status);
  if (options.provisionStatus) params.set('provision', options.provisionStatus);
  if (options.planSlug) params.set('plan', options.planSlug);
  if (options.sortBy !== 'created_at') params.set('sort', options.sortBy);
  if (options.sortOrder !== 'desc') params.set('order', options.sortOrder);
  const query = params.toString();
  return query ? `${ROUTES.masterEmpresas}?${query}` : ROUTES.masterEmpresas;
}

function EmpresasList({
  initialData,
  initialSearch,
  initialPage,
  initialStatus,
  initialProvisionStatus,
  initialPlanSlug,
  initialSortBy,
  initialSortOrder,
  plans,
  error,
}: EmpresasListProps) {
  const router = useRouter();
  const [search, setSearch] = React.useState(initialSearch);
  const [modalOpen, setModalOpen] = React.useState(false);

  const items = initialData?.items ?? [];
  const total = initialData?.total ?? 0;
  const page = initialData?.page ?? initialPage;
  const totalPages = initialData?.totalPages ?? 1;

  const listOptions = React.useMemo(
    () => ({
      search: initialSearch,
      page,
      status: initialStatus,
      provisionStatus: initialProvisionStatus,
      planSlug: initialPlanSlug,
      sortBy: initialSortBy,
      sortOrder: initialSortOrder,
    }),
    [
      initialSearch,
      page,
      initialStatus,
      initialProvisionStatus,
      initialPlanSlug,
      initialSortBy,
      initialSortOrder,
    ],
  );

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      if (search === initialSearch) return;
      router.push(buildListUrl({...listOptions, search, page: 1}));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search, initialSearch, router, listOptions]);

  function handleFilterChange(
    key: 'status' | 'provisionStatus' | 'planSlug' | 'sortBy' | 'sortOrder',
    value: string,
  ) {
    const next = {...listOptions, page: 1};
    if (key === 'status') {
      next.status = value ? (value as EntityStatus) : undefined;
    } else if (key === 'provisionStatus') {
      next.provisionStatus = value ? (value as ProvisionStatus) : undefined;
    } else if (key === 'planSlug') {
      next.planSlug = value || undefined;
    } else if (key === 'sortBy') {
      next.sortBy = value as CompanySortField;
    } else {
      next.sortOrder = value as CompanySortOrder;
    }
    router.push(buildListUrl(next));
  }

  function handleCreated() {
    setModalOpen(false);
    router.refresh();
  }

  function goToPage(nextPage: number) {
    router.push(buildListUrl({...listOptions, page: nextPage}));
  }

  const columns = [
    {
      id: 'legalName',
      header: 'Razão Social',
      cell: (row: CompanyListItem) => (
        <Link
          href={ROUTES.masterEmpresaDetail(row.id)}
          className="font-medium hover:text-primary hover:underline"
        >
          {row.legalName}
        </Link>
      ),
    },
    {
      id: 'tradeName',
      header: 'Nome Fantasia',
      cell: (row: CompanyListItem) => row.tradeName ?? '—',
    },
    {
      id: 'taxId',
      header: 'CNPJ',
      cell: (row: CompanyListItem) => formatCompanyTaxIdDisplay(row.taxId),
    },
    {
      id: 'slug',
      header: 'Slug',
      cell: (row: CompanyListItem) => (
        <span className="font-mono text-xs text-muted-foreground">{row.slug}</span>
      ),
    },
    {
      id: 'plan',
      header: 'Plano',
      cell: (row: CompanyListItem) => (
        <Badge variant="secondary">{getPlanLabel(plans, row.planSlug)}</Badge>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row: CompanyListItem) => (
        <Badge variant={getStatusVariant(row.status)}>
          {ENTITY_STATUS_LABELS[row.status]}
        </Badge>
      ),
    },
    {
      id: 'provision',
      header: 'Provisionamento',
      cell: (row: CompanyListItem) => (
        <Badge variant={getProvisionVariant(row.provisionStatus)}>
          {PROVISION_STATUS_LABELS[row.provisionStatus]}
        </Badge>
      ),
    },
    {
      id: 'admin',
      header: 'Administrador',
      cell: (row: CompanyListItem) =>
        row.adminName ? (
          <div>
            <p className="text-sm font-medium">{row.adminName}</p>
            <p className="text-xs text-muted-foreground">{row.adminEmail}</p>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: 'accessUrl',
      header: 'URL de acesso',
      cell: (row: CompanyListItem) => (
        <a
          href={row.accessUrl}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-xs text-primary hover:underline"
        >
          {row.accessUrl.replace(/^https?:\/\//, '')}
        </a>
      ),
    },
    {
      id: 'createdAt',
      header: 'Cadastro',
      cell: (row: CompanyListItem) =>
        new Date(row.createdAt).toLocaleDateString('pt-BR'),
    },
  ];

  const selectClassName =
    'flex h-9 rounded-lg border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30';

  return (
    <>
      <TableContainer
        title="Empresas clientes"
        description={`${total} empresa(s) encontrada(s)`}
        toolbar={
          <>
            <SearchInput
              value={search}
              onValueChange={setSearch}
              placeholder="Buscar por nome, CNPJ ou slug..."
              className="w-full sm:w-64"
            />
            <select
              aria-label="Filtrar por status"
              value={initialStatus ?? ''}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className={selectClassName}
            >
              <option value="">Todos os status</option>
              {(Object.keys(ENTITY_STATUS_LABELS) as EntityStatus[]).map((status) => (
                <option key={status} value={status}>
                  {ENTITY_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
            <select
              aria-label="Filtrar por provisionamento"
              value={initialProvisionStatus ?? ''}
              onChange={(e) => handleFilterChange('provisionStatus', e.target.value)}
              className={selectClassName}
            >
              <option value="">Provisionamento</option>
              {(Object.keys(PROVISION_STATUS_LABELS) as ProvisionStatus[]).map(
                (status) => (
                  <option key={status} value={status}>
                    {PROVISION_STATUS_LABELS[status]}
                  </option>
                ),
              )}
            </select>
            <select
              aria-label="Filtrar por plano"
              value={initialPlanSlug ?? ''}
              onChange={(e) => handleFilterChange('planSlug', e.target.value)}
              className={selectClassName}
            >
              <option value="">Todos os planos</option>
              {plans.map((plan) => (
                <option key={plan.slug} value={plan.slug}>
                  {plan.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Ordenar"
              value={`${initialSortBy}:${initialSortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split(':');
                router.push(
                  buildListUrl({
                    ...listOptions,
                    sortBy: sortBy as CompanySortField,
                    sortOrder: sortOrder as CompanySortOrder,
                    page: 1,
                  }),
                );
              }}
              className={selectClassName}
            >
              <option value="created_at:desc">Mais recentes</option>
              <option value="created_at:asc">Mais antigas</option>
              <option value="legal_name:asc">Nome A–Z</option>
              <option value="legal_name:desc">Nome Z–A</option>
              <option value="status:asc">Status</option>
            </select>
            <Button size="sm" onClick={() => setModalOpen(true)}>
              <Plus className="size-4" />
              Nova Empresa
            </Button>
          </>
        }
      >
        {error && (
          <div className="px-6 pt-4">
            <Alert variant="destructive">
              <AlertDescription className="flex items-center justify-between gap-4">
                <span>{error}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => router.refresh()}
                >
                  Tentar novamente
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        <DataTable
          columns={columns}
          data={items}
          getRowKey={(row) => row.id}
          loading={false}
          emptyTitle="Nenhuma empresa encontrada"
          emptyDescription="Tente ajustar os filtros ou cadastre uma nova empresa."
        />

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-6 py-4">
            <p className="text-sm text-muted-foreground">
              Página {page} de {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => goToPage(page - 1)}
              >
                <ChevronLeft className="size-4" />
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => goToPage(page + 1)}
              >
                Próxima
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </TableContainer>

      <NovaEmpresaModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
        plans={plans}
      />
    </>
  );
}

export {EmpresasList};
