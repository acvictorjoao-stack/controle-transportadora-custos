'use client';

import {Eye, Pencil, Plus, Trash2, Upload} from 'lucide-react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import * as React from 'react';

import {useSyncedListData} from '@/hooks/use-synced-list-data';

import {RowActionsMenu, RowActionsMenuItem} from '@/components/common/row-actions-menu';
import {DataTable} from '@/components/data-display/data-table';
import {ListPagination} from '@/components/data-display/list-pagination';
import {TableContainer} from '@/components/data-display/table-container';
import {SearchInput} from '@/components/forms/search-input';
import {PageTemplate} from '@/components/layout/page-template';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {useConfirm} from '@/contexts/feedback/confirm-context';
import {useToast} from '@/contexts/feedback/toast-context';
import {ROUTES} from '@/constants/routes/paths';
import {MSG} from '@/lib/feedback/messages';

import {deleteRouteAction, updateRouteStatusAction} from '../actions';
import {RouteImportModal} from '../import';
import type {

  PaginatedRoutes,
  Route,
  RouteFilterOptions,
  RouteListFilters,
  RouteOperationalStatus,
  RouteSortOptions,
} from '../types';
import {ROUTE_OPERATIONAL_STATUS_LABELS} from '../types';
import {buildRoutesListUrl} from '../utils/list-url';
import {
  formatDistanceKm,
  formatLeadTimeDays,
  formatRouteDisplayName,
  getRouteOperationalStatusVariant,
} from '../utils/route-format';
import type {RouteFormOption} from './route-form-modal';
import {RouteFilters} from './route-filters';
import {RouteFormModal} from './route-form-modal';

export interface RoutesListProps {
  initialData: PaginatedRoutes;
  initialSearch: string;
  initialFilters: RouteListFilters;
  initialSort: RouteSortOptions;
  filterOptions: RouteFilterOptions;
  customers: RouteFormOption[];
  branches: RouteFormOption[];
  error: string | null;
}

function RoutesList({
  initialData,
  initialSearch,
  initialFilters,
  initialSort,
  filterOptions,
  customers,
  branches,
  error: initialError,
}: RoutesListProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [search, setSearch] = React.useState(initialSearch);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const [editingRoute, setEditingRoute] = React.useState<Route | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(initialError);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);

  const {data, removeItem, patchItem, upsertItem} = useSyncedListData(initialData);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      if (search === initialSearch) return;
      router.push(
        buildRoutesListUrl({
          search,
          page: 1,
          filters: initialFilters,
          sort: initialSort,
        }),
      );
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search, initialSearch, initialFilters, initialSort, router]);

  function handlePageChange(page: number) {
    router.push(
      buildRoutesListUrl({
        search,
        page,
        filters: initialFilters,
        sort: initialSort,
      }),
    );
  }

  function openCreate() {
    setEditingRoute(null);
    setModalOpen(true);
  }

  function openEdit(route: Route) {
    setEditingRoute(route);
    setModalOpen(true);
  }

  async function handleDelete(route: Route) {
    const confirmed = await confirm({
      title: MSG.deleteConfirmTitle,
      description: MSG.deleteConfirmDescription,
      confirmLabel: MSG.deleteConfirmLabel,
      variant: 'destructive',
    });
    if (!confirmed) return;

    setActionLoading(route.id);
    setActionError(null);

    const result = await deleteRouteAction(route.id);
    if (!result.success) {
      toast.error(result.error ?? MSG.operationFailed);
    } else {
      toast.success(MSG.deletedFeminine('Rota'));
      removeItem(route.id);
    }
    setActionLoading(null);
    setOpenMenuId(null);
  }

  async function handleStatusChange(
    route: Route,
    operationalStatus: RouteOperationalStatus,
  ) {
    setActionLoading(route.id);
    setActionError(null);

    const result = await updateRouteStatusAction(route.id, {operationalStatus});
    if (!result.success) {
      toast.error(result.error ?? MSG.operationFailed);
    } else {
      toast.success(
        MSG.statusChangedFeminine(
          'Rota',
          ROUTE_OPERATIONAL_STATUS_LABELS[operationalStatus],
        ),
      );
      patchItem(route.id, {operationalStatus});
    }
    setActionLoading(null);
    setOpenMenuId(null);
  }

  function handleSaved() {
    router.refresh();
  }

  const columns = [
    {
      id: 'name',
      header: 'Nome da Rota',
      cell: (row: Route) => (
        <Link
          href={ROUTES.rotaDetail(row.id)}
          className="font-medium hover:underline"
        >
          {formatRouteDisplayName(row)}
        </Link>
      ),
    },
    {
      id: 'origin',
      header: 'Origem',
      cell: (row: Route) => row.origin,
    },
    {
      id: 'destination',
      header: 'Destino',
      cell: (row: Route) => row.destination,
    },
    {
      id: 'customer',
      header: 'Cliente',
      cell: (row: Route) => row.customerName ?? '—',
    },
    {
      id: 'branch',
      header: 'Filial',
      cell: (row: Route) => row.branchName ?? '—',
    },
    {
      id: 'distance',
      header: 'Distância',
      cell: (row: Route) => formatDistanceKm(row.plannedDistanceKm),
    },
    {
      id: 'leadTime',
      header: 'Lead Time',
      cell: (row: Route) => formatLeadTimeDays(row.leadTimeDays),
    },
    {
      id: 'operationalStatus',
      header: 'Situação',
      cell: (row: Route) => (
        <Badge variant={getRouteOperationalStatusVariant(row.operationalStatus)}>
          {ROUTE_OPERATIONAL_STATUS_LABELS[row.operationalStatus]}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      className: 'w-12',
      cell: (row: Route) => (
        <RowActionsMenu
          open={openMenuId === row.id}
          onOpenChange={(open) => setOpenMenuId(open ? row.id : null)}
          disabled={actionLoading === row.id}
        >
          <Link
            href={ROUTES.rotaDetail(row.id)}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
            onClick={() => setOpenMenuId(null)}
          >
            <Eye className="size-4" /> Ver detalhes
          </Link>
          <RowActionsMenuItem
            onClick={() => {
              openEdit(row);
              setOpenMenuId(null);
            }}
          >
            <Pencil className="size-4" /> Editar
          </RowActionsMenuItem>
          {(Object.keys(ROUTE_OPERATIONAL_STATUS_LABELS) as RouteOperationalStatus[])
            .filter((s) => s !== row.operationalStatus)
            .map((status) => (
              <RowActionsMenuItem
                key={status}
                onClick={() => handleStatusChange(row, status)}
              >
                {ROUTE_OPERATIONAL_STATUS_LABELS[status]}
              </RowActionsMenuItem>
            ))}
          <RowActionsMenuItem destructive onClick={() => handleDelete(row)}>
            <Trash2 className="size-4" /> Excluir
          </RowActionsMenuItem>
        </RowActionsMenu>
      ),
    },
  ];

  return (
    <PageTemplate
      title="Rotas"
      description="Cadastro de rotas operacionais (origem, destino e lead time em dias)"
      actions={
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="size-4" />
            Importar
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4" />
            Nova rota
          </Button>
        </div>
      }
      actionBar={{
        leading: (
          <div className="flex w-full flex-col gap-3">
            <SearchInput
              value={search}
              onValueChange={setSearch}
              placeholder="Buscar por nome, origem ou destino..."
              className="w-full max-w-md"
            />
            <RouteFilters
              filterOptions={filterOptions}
              initialFilters={initialFilters}
              initialSort={initialSort}
            />
          </div>
        ),
      }}
    >
      {actionError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      <TableContainer>
        <DataTable
          columns={columns}
          data={data.items}
          getRowKey={(row) => row.id}
          emptyTitle="Nenhuma rota cadastrada"
          emptyDescription="Cadastre a primeira rota operacional da empresa."
          emptyAction={{label: 'Nova rota', onClick: openCreate}}
        />
      </TableContainer>

      <ListPagination
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        totalPages={data.totalPages}
        itemLabel="rota"
        onPageChange={handlePageChange}
      />

      <RouteFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        route={editingRoute}
        onSaved={handleSaved}
        customers={customers}
        branches={branches}
      />

      <RouteImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => router.refresh()}
      />
    </PageTemplate>
  );
}

export {RoutesList};
