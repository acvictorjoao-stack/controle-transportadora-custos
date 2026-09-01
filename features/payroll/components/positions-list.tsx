'use client';

import {Pencil, Plus} from 'lucide-react';
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
import {ROUTES} from '@/constants/routes/paths';
import {useToast} from '@/contexts/feedback/toast-context';
import {useNavPermissions} from '@/hooks/use-nav-permissions';
import {hasPermission} from '@/lib/navigation/has-permission';
import {MSG} from '@/lib/feedback/messages';

import {togglePositionStatusAction} from '../actions';
import type {PaginatedPositions, Position} from '../types';
import {PERSONNEL_STATUS_LABELS} from '../types';
import {PositionFormModal} from './position-form-modal';

export interface PositionsListProps {
  initialData: PaginatedPositions;
  initialSearch: string;
  error: string | null;
}

function buildListUrl(search: string, page: number): string {
  const params = new URLSearchParams();
  if (search.trim()) params.set('q', search.trim());
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `${ROUTES.administracaoCargos}?${query}` : ROUTES.administracaoCargos;
}

function statusVariant(status: Position['status']) {
  return status === 'active' ? ('success' as const) : ('warning' as const);
}

function PositionsList({initialData, initialSearch, error: initialError}: PositionsListProps) {
  const router = useRouter();
  const toast = useToast();
  const permissions = useNavPermissions();
  const canCreate = hasPermission('financeiro:create', permissions);
  const canUpdate = hasPermission('financeiro:update', permissions);

  const [search, setSearch] = React.useState(initialSearch);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Position | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(initialError);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);

  const {data, patchItem, upsertItem} = useSyncedListData(initialData);

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

  function openEdit(position: Position) {
    setEditing(position);
    setModalOpen(true);
  }

  async function handleToggleStatus(position: Position) {
    setActionLoading(position.id);
    setActionError(null);

    const result = await togglePositionStatusAction(position.id, position.status !== 'active');
    if (!result.success) {
      toast.error(result.error ?? MSG.operationFailed);
    } else {
      toast.success(
        position.status === 'active'
          ? MSG.deactivated('Cargo')
          : MSG.activated('Cargo'),
      );
      if (result.data) upsertItem(result.data);
      else {
        patchItem(position.id, {
          status: position.status === 'active' ? 'inactive' : 'active',
          active: position.status !== 'active',
        });
      }
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
      header: 'Nome',
      cell: (row: Position) => <span className="font-medium">{row.name}</span>,
    },
    {
      id: 'code',
      header: 'Código',
      cell: (row: Position) => (
        <span className="font-mono text-xs">{row.code}</span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row: Position) => (
        <Badge variant={statusVariant(row.status)}>
          {PERSONNEL_STATUS_LABELS[row.status === 'active' ? 'active' : 'inactive']}
        </Badge>
      ),
    },
    {
      id: 'origin',
      header: 'Sistema/Personalizado',
      cell: (row: Position) => (
        <span className="text-sm text-muted-foreground">
          {row.isSystem ? 'Sistema' : 'Personalizado'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      className: 'w-12',
      cell: (row: Position) =>
        canUpdate ? (
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
          </RowActionsMenu>
        ) : null,
    },
  ];

  return (
    <PageTemplate
      title="Cargos"
      description="Cadastro de cargos e funções da empresa para folha e colaboradores."
      actions={
        canCreate ? (
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4" />
            Novo cargo
          </Button>
        ) : undefined
      }
      actionBar={{
        leading: (
          <SearchInput
            value={search}
            onValueChange={setSearch}
            placeholder="Buscar por nome ou código…"
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
          emptyTitle="Nenhum cargo cadastrado"
          emptyDescription="Os cargos padrão são criados automaticamente. Você pode adicionar novos."
          emptyAction={canCreate ? {label: 'Novo cargo', onClick: openCreate} : undefined}
        />
      </TableContainer>

      <ListPagination
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        totalPages={data.totalPages}
        itemLabel="cargo"
        onPageChange={handlePageChange}
      />

      <PositionFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        position={editing}
        onSaved={handleSaved}
      />
    </PageTemplate>
  );
}

export {PositionsList};
