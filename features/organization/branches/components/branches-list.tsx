'use client';

import {Building2, Pencil, Plus, Star, Trash2} from 'lucide-react';
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
import {formatTaxId} from '@/features/master/companies/utils/format';

import {
  deleteBranchAction,
  setHeadquartersAction,
  toggleBranchStatusAction,
} from '../actions';
import {BRANCH_STATUS_LABELS} from '../types';
import type {Branch, PaginatedBranches} from '../types';
import {BranchFormModal} from './branch-form-modal';

export interface BranchesListProps {
  initialData: PaginatedBranches;
  initialSearch: string;
  initialPage: number;
  error: string | null;
}

function getStatusVariant(status: Branch['status']) {
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
  return query ? `${ROUTES.filiais}?${query}` : ROUTES.filiais;
}

function BranchesList({
  initialData,
  initialSearch,
  initialPage,
  error: initialError,
}: BranchesListProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [search, setSearch] = React.useState(initialSearch);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingBranch, setEditingBranch] = React.useState<Branch | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(initialError);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);

  const data = initialData;
  const page = data.page;

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
    setEditingBranch(null);
    setModalOpen(true);
  }

  function openEdit(branch: Branch) {
    setEditingBranch(branch);
    setModalOpen(true);
  }

  async function handleDelete(branch: Branch) {
    const confirmed = await confirm({
      title: 'Excluir filial',
      description: `Excluir a filial "${branch.name}"? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      variant: 'destructive',
    });
    if (!confirmed) return;

    setActionLoading(branch.id);
    setActionError(null);

    const result = await deleteBranchAction(branch.id);
    if (!result.success) {
      setActionError(result.error);
      toast.error(result.error);
    } else {
      toast.success('Filial excluída com sucesso');
      router.refresh();
    }
    setActionLoading(null);
    setOpenMenuId(null);
  }

  async function handleToggleStatus(branch: Branch) {
    setActionLoading(branch.id);
    setActionError(null);

    const result = await toggleBranchStatusAction(
      branch.id,
      branch.status !== 'active',
    );
    if (!result.success) {
      setActionError(result.error);
      toast.error(result.error);
    } else {
      toast.success(branch.status === 'active' ? 'Filial inativada' : 'Filial ativada');
      router.refresh();
    }
    setActionLoading(null);
    setOpenMenuId(null);
  }

  async function handleSetHeadquarters(branch: Branch) {
    setActionLoading(branch.id);
    setActionError(null);

    const result = await setHeadquartersAction(branch.id);
    if (!result.success) {
      setActionError(result.error);
      toast.error(result.error);
    } else {
      toast.success('Filial definida como matriz');
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
      cell: (row: Branch) => (
        <span className="font-mono text-xs">{row.code}</span>
      ),
    },
    {
      id: 'name',
      header: 'Nome',
      cell: (row: Branch) => (
        <div className="flex items-center gap-2">
          {row.name}
          {row.isHeadquarters && (
            <Badge variant="info" className="gap-1">
              <Star className="size-3" />
              Matriz
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: 'taxId',
      header: 'CNPJ',
      cell: (row: Branch) => (
        <span className="text-muted-foreground">
          {row.taxId ? formatTaxId(row.taxId) : '—'}
        </span>
      ),
    },
    {
      id: 'responsible',
      header: 'Responsável',
      cell: (row: Branch) => row.responsibleName ?? '—',
    },
    {
      id: 'phone',
      header: 'Telefone',
      cell: (row: Branch) => row.phone ?? '—',
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row: Branch) => (
        <Badge variant={getStatusVariant(row.status)}>
          {BRANCH_STATUS_LABELS[row.status]}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      className: 'w-12',
      cell: (row: Branch) => (
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
          {!row.isHeadquarters && (
            <RowActionsMenuItem onClick={() => handleSetHeadquarters(row)}>
              <Building2 className="size-4" /> Definir como Matriz
            </RowActionsMenuItem>
          )}
          <RowActionsMenuItem onClick={() => handleToggleStatus(row)}>
            {row.status === 'active' ? 'Inativar' : 'Ativar'}
          </RowActionsMenuItem>
          {!row.isHeadquarters && (
            <RowActionsMenuItem destructive onClick={() => handleDelete(row)}>
              <Trash2 className="size-4" /> Excluir
            </RowActionsMenuItem>
          )}
        </RowActionsMenu>
      ),
    },
  ];

  return (
    <PageTemplate
      title="Filiais"
      description="Gerencie as unidades operacionais da transportadora"
      actions={
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" />
          Nova filial
        </Button>
      }
      actionBar={{
        leading: (
          <SearchInput
            value={search}
            onValueChange={setSearch}
            placeholder="Buscar por nome, código ou CNPJ..."
            className="w-full max-w-sm"
          />
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
          emptyTitle="Nenhuma filial cadastrada"
          emptyDescription="Cadastre a primeira filial da sua transportadora."
          emptyAction={{label: 'Nova filial', onClick: openCreate}}
        />
      </TableContainer>

      <ListPagination
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        totalPages={data.totalPages}
        itemLabel="filial"
        onPageChange={handlePageChange}
      />

      <BranchFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        branch={editingBranch}
        onSaved={handleSaved}
      />
    </PageTemplate>
  );
}

export {BranchesList};
