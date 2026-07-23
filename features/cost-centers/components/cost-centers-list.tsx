'use client';

import {Pencil, Plus, Trash2} from 'lucide-react';
import {useRouter} from 'next/navigation';
import * as React from 'react';

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

import {
  deleteCostCenterAction,
  toggleCostCenterStatusAction,
} from '../actions';
import {COST_CENTER_STATUS_LABELS} from '../types';
import type {CostCenter, PaginatedCostCenters} from '../types';
import {CostCenterFormModal} from './cost-center-form-modal';

export interface CostCentersListProps {
  initialData: PaginatedCostCenters;
  initialSearch: string;
  error: string | null;
}

function getStatusVariant(status: CostCenter['status']) {
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

function buildListUrl(search: string, page: number): string {
  const params = new URLSearchParams();
  if (search.trim()) params.set('q', search.trim());
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `${ROUTES.centrosDeCusto}?${query}` : ROUTES.centrosDeCusto;
}

function CostCentersList({
  initialData,
  initialSearch,
  error: initialError,
}: CostCentersListProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [search, setSearch] = React.useState(initialSearch);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CostCenter | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(initialError);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);

  const data = initialData;

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      if (search === initialSearch) return;
      router.push(buildListUrl(search, 1));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search, initialSearch, router]);

  function handlePageChange(page: number) {
    router.push(buildListUrl(search, page));
  }

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(center: CostCenter) {
    setEditing(center);
    setModalOpen(true);
  }

  async function handleDelete(center: CostCenter) {
    const confirmed = await confirm({
      title: MSG.deleteConfirmTitle,
      description: MSG.deleteConfirmDescription,
      confirmLabel: MSG.deleteConfirmLabel,
      variant: 'destructive',
    });
    if (!confirmed) return;

    setActionLoading(center.id);
    setActionError(null);

    const result = await deleteCostCenterAction(center.id);
    if (!result.success) {
      toast.error(result.error ?? MSG.operationFailed);
    } else {
      toast.success(MSG.deleted('Centro de custo'));
      router.refresh();
    }
    setActionLoading(null);
    setOpenMenuId(null);
  }

  async function handleToggleStatus(center: CostCenter) {
    setActionLoading(center.id);
    setActionError(null);

    const result = await toggleCostCenterStatusAction(
      center.id,
      center.status !== 'active',
    );
    if (!result.success) {
      toast.error(result.error ?? MSG.operationFailed);
    } else {
      toast.success(
        center.status === 'active'
          ? MSG.deactivated('Centro de custo')
          : MSG.activated('Centro de custo'),
      );
      router.refresh();
    }
    setActionLoading(null);
    setOpenMenuId(null);
  }

  function handleSaved() {
    router.refresh();
  }

  const columns = [
    {
      id: 'code',
      header: 'Código',
      cell: (row: CostCenter) => (
        <span className="font-mono text-xs">{row.code}</span>
      ),
    },
    {
      id: 'name',
      header: 'Nome',
      cell: (row: CostCenter) => (
        <div className="flex flex-col gap-0.5">
          <span>{row.name}</span>
          {row.isSystem ? (
            <span className="text-xs text-muted-foreground">Sistema</span>
          ) : null}
        </div>
      ),
    },
    {
      id: 'description',
      header: 'Descrição',
      cell: (row: CostCenter) => (
        <span className="text-muted-foreground">{row.description ?? '—'}</span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row: CostCenter) => (
        <Badge variant={getStatusVariant(row.status)}>
          {COST_CENTER_STATUS_LABELS[row.status]}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      className: 'w-12',
      cell: (row: CostCenter) => (
        <RowActionsMenu
          open={openMenuId === row.id}
          onOpenChange={(open) => setOpenMenuId(open ? row.id : null)}
          disabled={actionLoading === row.id}
        >
          <RowActionsMenuItem
            onClick={() => {
              openEdit(row);
              setOpenMenuId(null);
            }}
          >
            <Pencil className="size-4" /> Editar
          </RowActionsMenuItem>
          <RowActionsMenuItem onClick={() => handleToggleStatus(row)}>
            {row.status === 'active' ? 'Inativar' : 'Ativar'}
          </RowActionsMenuItem>
          {!row.isSystem ? (
            <RowActionsMenuItem destructive onClick={() => handleDelete(row)}>
              <Trash2 className="size-4" /> Excluir
            </RowActionsMenuItem>
          ) : null}
        </RowActionsMenu>
      ),
    },
  ];

  return (
    <PageTemplate
      title="Centros de Custo"
      description="Áreas da empresa para análise financeira (Operacional, Administrativo, Comercial, RH, TI)."
      actions={
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" />
          Novo centro
        </Button>
      }
      actionBar={{
        leading: (
          <SearchInput
            value={search}
            onValueChange={setSearch}
            placeholder="Buscar por código ou nome…"
            className="w-full max-w-sm"
          />
        ),
      }}
    >
      {actionError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}

      <TableContainer>
        <DataTable
          columns={columns}
          data={data.items}
          getRowKey={(row) => row.id}
          emptyTitle="Nenhum centro de custo cadastrado"
          emptyDescription="Os centros padrão são criados automaticamente. Você pode adicionar novos."
          emptyAction={{label: 'Novo centro', onClick: openCreate}}
        />
      </TableContainer>

      <ListPagination
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        totalPages={data.totalPages}
        itemLabel="centro"
        onPageChange={handlePageChange}
      />

      <CostCenterFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        costCenter={editing}
        onSaved={handleSaved}
      />
    </PageTemplate>
  );
}

export {CostCentersList};
