'use client';

import {Ban, CheckCircle2, Eye, ExternalLink, Pencil, Plus, Trash2} from 'lucide-react';
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
import {
  ACCOUNTS_PAYABLE_STATUS_LABELS,
} from '@/features/financial/types/financial-entry';
import {formatCurrencyBr, formatDateBr} from '@/features/financial/utils/financial-format';
import type {FinancialEntryStatus} from '@/features/financial/types';
import type {SupplierSelectOption} from '@/features/suppliers/types';

import {
  cancelAccountsPayableAction,
  deleteAccountsPayableAction,
} from '../actions';
import type {
  AccountsPayableCategory,
  AccountsPayableCostCenter,
  AccountsPayableEntry,
  AccountsPayableListFilters,
  AccountsPayableSortOptions,
  PaginatedAccountsPayable,
} from '../types';
import {buildAccountsPayableListUrl} from '../utils/list-url';
import {
  formatAccountsPayableOrigin,
  getAccountsPayableOriginHref,
  isManualAccountsPayableEntry,
} from '../utils/origin';
import {AccountsPayableFilters} from './accounts-payable-filters';
import {AccountsPayableFormModal} from './accounts-payable-form-modal';
import {AccountsPayablePayModal} from './accounts-payable-pay-modal';

export interface AccountsPayableListProps {
  initialData: PaginatedAccountsPayable;
  initialSearch: string;
  initialFilters: AccountsPayableListFilters;
  initialSort: AccountsPayableSortOptions;
  categories: AccountsPayableCategory[];
  costCenters: AccountsPayableCostCenter[];
  suppliers: SupplierSelectOption[];
  companyName?: string | null;
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
    return ACCOUNTS_PAYABLE_STATUS_LABELS.pending;
  }
  if (status === 'paid' || status === 'cancelled') {
    return ACCOUNTS_PAYABLE_STATUS_LABELS[status];
  }
  return status;
}

function isOpenStatus(status: FinancialEntryStatus): boolean {
  return status === 'pending' || status === 'overdue';
}

function AccountsPayableList({
  initialData,
  initialSearch,
  initialFilters,
  initialSort,
  categories,
  costCenters,
  suppliers,
  companyName,
  error: initialError,
}: AccountsPayableListProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [search, setSearch] = React.useState(initialSearch);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [payModalOpen, setPayModalOpen] = React.useState(false);
  const [editingEntry, setEditingEntry] = React.useState<AccountsPayableEntry | null>(null);
  const [payingEntry, setPayingEntry] = React.useState<AccountsPayableEntry | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(initialError);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);

  const data = initialData;

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      if (search === initialSearch) return;
      router.push(
        buildAccountsPayableListUrl({
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
      buildAccountsPayableListUrl({
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

  function openEdit(entry: AccountsPayableEntry) {
    if (!isManualAccountsPayableEntry(entry)) {
      toast.error('Altere esta conta no módulo de origem.');
      return;
    }
    setEditingEntry(entry);
    setModalOpen(true);
  }

  function openPay(entry: AccountsPayableEntry) {
    setPayingEntry(entry);
    setPayModalOpen(true);
  }

  async function handleCancel(entry: AccountsPayableEntry) {
    const confirmed = await confirm({
      title: 'Cancelar conta',
      description: 'Cancelar esta conta a pagar? Esta ação altera o status para Cancelado.',
      confirmLabel: 'Cancelar conta',
      variant: 'destructive',
    });
    if (!confirmed) return;

    setActionLoading(entry.id);
    setActionError(null);

    const result = await cancelAccountsPayableAction(entry.id);
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

  async function handleDelete(entry: AccountsPayableEntry) {
    const confirmed = await confirm({
      title: 'Excluir conta',
      description: 'Excluir esta conta a pagar? Esta ação não pode ser desfeita.',
      confirmLabel: 'Excluir',
      variant: 'destructive',
    });
    if (!confirmed) return;

    setActionLoading(entry.id);
    setActionError(null);

    const result = await deleteAccountsPayableAction(entry.id);
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
      cell: (row: AccountsPayableEntry) => formatDateBr(row.dueDate),
    },
    {
      id: 'supplier',
      header: 'Fornecedor',
      cell: (row: AccountsPayableEntry) => row.supplier ?? '—',
    },
    {
      id: 'category',
      header: 'Categoria',
      cell: (row: AccountsPayableEntry) => row.categoryName ?? '—',
    },
    {
      id: 'origin',
      header: 'Origem',
      cell: (row: AccountsPayableEntry) => formatAccountsPayableOrigin(row),
    },
    {
      id: 'document',
      header: 'Documento',
      cell: (row: AccountsPayableEntry) => row.referenceNumber ?? '—',
    },
    {
      id: 'amount',
      header: 'Valor',
      cell: (row: AccountsPayableEntry) => formatCurrencyBr(row.amount, row.currency),
    },
    {
      id: 'entryStatus',
      header: 'Status',
      cell: (row: AccountsPayableEntry) => (
        <Badge variant={statusBadgeVariant(row.entryStatus)}>
          {statusLabel(row.entryStatus)}
        </Badge>
      ),
    },
    {
      id: 'company',
      header: 'Empresa',
      cell: () => companyName ?? '—',
    },
    {
      id: 'actions',
      header: '',
      className: 'w-12',
      cell: (row: AccountsPayableEntry) => {
        const originHref = getAccountsPayableOriginHref(row);
        const canEdit = isManualAccountsPayableEntry(row);

        return (
          <RowActionsMenu
            open={openMenuId === row.id}
            onOpenChange={(open) => setOpenMenuId(open ? row.id : null)}
            disabled={actionLoading === row.id}
          >
            <Link
              href={ROUTES.contasAPagarDetail(row.id)}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
              onClick={() => setOpenMenuId(null)}
            >
              <Eye className="size-4" /> Visualizar
            </Link>
            {originHref && (
              <Link
                href={originHref}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
                onClick={() => setOpenMenuId(null)}
              >
                <ExternalLink className="size-4" /> Abrir origem
              </Link>
            )}
            {isOpenStatus(row.entryStatus) && (
              <>
                {canEdit && (
                  <RowActionsMenuItem
                    onClick={() => {
                      openEdit(row);
                      setOpenMenuId(null);
                    }}
                  >
                    <Pencil className="size-4" /> Editar
                  </RowActionsMenuItem>
                )}
                <RowActionsMenuItem
                  onClick={() => {
                    openPay(row);
                    setOpenMenuId(null);
                  }}
                >
                  <CheckCircle2 className="size-4" /> Marcar como pago
                </RowActionsMenuItem>
                <RowActionsMenuItem destructive onClick={() => handleCancel(row)}>
                  <Ban className="size-4" /> Cancelar
                </RowActionsMenuItem>
              </>
            )}
            {canEdit && (
              <RowActionsMenuItem destructive onClick={() => handleDelete(row)}>
                <Trash2 className="size-4" /> Excluir
              </RowActionsMenuItem>
            )}
          </RowActionsMenu>
        );
      },
    },
  ];

  return (
    <PageTemplate
      title="Contas a Pagar"
      description="Gerencie obrigações financeiras — incluindo lançamentos gerados pelos módulos operacionais"
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
          placeholder="Buscar por descrição ou fornecedor..."
          className="max-w-md"
        />
      </div>

      <AccountsPayableFilters
        categories={categories}
        initialFilters={initialFilters}
        initialSort={initialSort}
      />

      <TableContainer className="mt-4">
        <DataTable
          columns={columns}
          data={data.items}
          getRowKey={(row) => row.id}
          emptyTitle="Nenhuma conta a pagar encontrada"
          emptyDescription="Cadastre despesas administrativas ou registre custos a prazo nos módulos operacionais."
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

      <AccountsPayableFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        entry={editingEntry}
        categories={categories}
        costCenters={costCenters}
        suppliers={suppliers}
        onSaved={handleSaved}
      />

      <AccountsPayablePayModal
        open={payModalOpen}
        onClose={() => {
          setPayModalOpen(false);
          setPayingEntry(null);
        }}
        entry={payingEntry}
        onPaid={handleSaved}
      />
    </PageTemplate>
  );
}

export {AccountsPayableList};
