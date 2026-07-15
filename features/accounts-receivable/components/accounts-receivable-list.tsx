'use client';

import {Ban, CheckCircle2, Eye, Pencil, Plus, Trash2} from 'lucide-react';
import Link from 'next/link';
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
import {ACCOUNTS_RECEIVABLE_STATUS_LABELS} from '@/features/financial/types/financial-entry';
import {formatCurrencyBr, formatDateBr} from '@/features/financial/utils/financial-format';
import type {FinancialEntryStatus} from '@/features/financial/types';

import {
  cancelAccountsReceivableAction,
  deleteAccountsReceivableAction,
} from '../actions';
import type {
  AccountsReceivableCategory,
  AccountsReceivableCostCenter,
  AccountsReceivableEntry,
  AccountsReceivableListFilters,
  AccountsReceivableSortOptions,
  PaginatedAccountsReceivable,
} from '../types';
import {buildAccountsReceivableListUrl} from '../utils/list-url';
import {AccountsReceivableFilters} from './accounts-receivable-filters';
import {AccountsReceivableFormModal} from './accounts-receivable-form-modal';
import {AccountsReceivableReceiveModal} from './accounts-receivable-receive-modal';

export interface AccountsReceivableListProps {
  initialData: PaginatedAccountsReceivable;
  initialSearch: string;
  initialFilters: AccountsReceivableListFilters;
  initialSort: AccountsReceivableSortOptions;
  categories: AccountsReceivableCategory[];
  costCenters: AccountsReceivableCostCenter[];
  error: string | null;
}

function statusBadgeVariant(
  status: FinancialEntryStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'paid':
      return 'default';
    case 'pending':
    case 'overdue':
      return 'secondary';
    case 'cancelled':
      return 'outline';
    default:
      return 'outline';
  }
}

function statusLabel(status: FinancialEntryStatus): string {
  if (status === 'pending' || status === 'overdue') {
    return ACCOUNTS_RECEIVABLE_STATUS_LABELS.pending;
  }
  if (status === 'paid' || status === 'cancelled') {
    return ACCOUNTS_RECEIVABLE_STATUS_LABELS[status];
  }
  return status;
}

function isOpenStatus(status: FinancialEntryStatus): boolean {
  return status === 'pending' || status === 'overdue';
}

function AccountsReceivableList({
  initialData,
  initialSearch,
  initialFilters,
  initialSort,
  categories,
  costCenters,
  error: initialError,
}: AccountsReceivableListProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [search, setSearch] = React.useState(initialSearch);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [receiveModalOpen, setReceiveModalOpen] = React.useState(false);
  const [editingEntry, setEditingEntry] = React.useState<AccountsReceivableEntry | null>(null);
  const [receivingEntry, setReceivingEntry] = React.useState<AccountsReceivableEntry | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(initialError);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);

  const data = initialData;

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      if (search === initialSearch) return;
      router.push(
        buildAccountsReceivableListUrl({
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
      buildAccountsReceivableListUrl({
        search,
        page,
        filters: initialFilters,
        sort: initialSort,
      }),
    );
  }

  function openCreate() {
    setEditingEntry(null);
    setModalOpen(true);
  }

  function openEdit(entry: AccountsReceivableEntry) {
    setEditingEntry(entry);
    setModalOpen(true);
  }

  function openReceive(entry: AccountsReceivableEntry) {
    setReceivingEntry(entry);
    setReceiveModalOpen(true);
  }

  async function handleCancel(entry: AccountsReceivableEntry) {
    const confirmed = await confirm({
      title: 'Cancelar conta',
      description: 'Cancelar esta conta a receber? Esta ação altera o status para Cancelado.',
      confirmLabel: 'Cancelar conta',
      variant: 'destructive',
    });
    if (!confirmed) return;

    setActionLoading(entry.id);
    setActionError(null);

    const result = await cancelAccountsReceivableAction(entry.id);
    if (!result.success) {
      setActionError(result.error);
      toast.error(result.error);
    } else {
      toast.success('Conta cancelada com sucesso');
      router.refresh();
    }
    setActionLoading(null);
    setOpenMenuId(null);
  }

  async function handleDelete(entry: AccountsReceivableEntry) {
    const confirmed = await confirm({
      title: 'Excluir conta',
      description: 'Excluir esta conta a receber? Esta ação não pode ser desfeita.',
      confirmLabel: 'Excluir',
      variant: 'destructive',
    });
    if (!confirmed) return;

    setActionLoading(entry.id);
    setActionError(null);

    const result = await deleteAccountsReceivableAction(entry.id);
    if (!result.success) {
      setActionError(result.error);
      toast.error(result.error);
    } else {
      toast.success('Conta excluída com sucesso');
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
      id: 'dueDate',
      header: 'Vencimento',
      cell: (row: AccountsReceivableEntry) => formatDateBr(row.dueDate),
    },
    {
      id: 'client',
      header: 'Cliente',
      cell: (row: AccountsReceivableEntry) => row.client ?? '—',
    },
    {
      id: 'category',
      header: 'Categoria',
      cell: (row: AccountsReceivableEntry) => row.categoryName ?? '—',
    },
    {
      id: 'description',
      header: 'Descrição',
      cell: (row: AccountsReceivableEntry) => (
        <Link
          href={ROUTES.contasAReceberDetail(row.id)}
          className="text-sm font-medium hover:underline"
        >
          {row.description ?? '—'}
        </Link>
      ),
    },
    {
      id: 'amount',
      header: 'Valor',
      cell: (row: AccountsReceivableEntry) => formatCurrencyBr(row.amount, row.currency),
    },
    {
      id: 'entryStatus',
      header: 'Status',
      cell: (row: AccountsReceivableEntry) => (
        <Badge variant={statusBadgeVariant(row.entryStatus)}>
          {statusLabel(row.entryStatus)}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      className: 'w-12',
      cell: (row: AccountsReceivableEntry) => (
        <RowActionsMenu
          open={openMenuId === row.id}
          onOpenChange={(open) => setOpenMenuId(open ? row.id : null)}
          disabled={actionLoading === row.id}
        >
          <Link
            href={ROUTES.contasAReceberDetail(row.id)}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
            onClick={() => setOpenMenuId(null)}
          >
            <Eye className="size-4" /> Visualizar
          </Link>
          {isOpenStatus(row.entryStatus) && (
            <>
              <RowActionsMenuItem
                onClick={() => {
                  openEdit(row);
                  setOpenMenuId(null);
                }}
              >
                <Pencil className="size-4" /> Editar
              </RowActionsMenuItem>
              <RowActionsMenuItem
                onClick={() => {
                  openReceive(row);
                  setOpenMenuId(null);
                }}
              >
                <CheckCircle2 className="size-4" /> Marcar como recebido
              </RowActionsMenuItem>
              <RowActionsMenuItem destructive onClick={() => handleCancel(row)}>
                <Ban className="size-4" /> Cancelar
              </RowActionsMenuItem>
            </>
          )}
          <RowActionsMenuItem destructive onClick={() => handleDelete(row)}>
            <Trash2 className="size-4" /> Excluir
          </RowActionsMenuItem>
        </RowActionsMenu>
      ),
    },
  ];

  return (
    <PageTemplate
      title="Contas a Receber"
      description="Controle dos recebíveis da empresa"
      actions={
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" />
          Nova conta
        </Button>
      }
    >
      {actionError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <SearchInput
          value={search}
          onValueChange={setSearch}
          placeholder="Buscar por descrição ou cliente..."
          className="max-w-md"
        />
      </div>

      <AccountsReceivableFilters
        categories={categories}
        initialFilters={initialFilters}
        initialSort={initialSort}
      />

      <TableContainer className="mt-4">
        <DataTable
          columns={columns}
          data={data.items}
          getRowKey={(row) => row.id}
          emptyTitle="Nenhuma conta a receber encontrada"
          emptyDescription="Cadastre a primeira conta a receber."
          emptyAction={{label: 'Nova conta', onClick: openCreate}}
        />
      </TableContainer>

      <ListPagination
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        totalPages={data.totalPages}
        itemLabel="conta"
        onPageChange={handlePageChange}
      />

      <AccountsReceivableFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        entry={editingEntry}
        categories={categories}
        costCenters={costCenters}
        onSaved={handleSaved}
      />

      <AccountsReceivableReceiveModal
        open={receiveModalOpen}
        onClose={() => {
          setReceiveModalOpen(false);
          setReceivingEntry(null);
        }}
        entry={receivingEntry}
        onReceived={handleSaved}
      />
    </PageTemplate>
  );
}

export {AccountsReceivableList};
