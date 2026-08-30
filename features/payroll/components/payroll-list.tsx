'use client';

import {ExternalLink, Pencil, Plus, Trash2} from 'lucide-react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import * as React from 'react';

import {RowActionsMenu, RowActionsMenuItem} from '@/components/common/row-actions-menu';
import {DataTable} from '@/components/data-display/data-table';
import {ListPagination} from '@/components/data-display/list-pagination';
import {StatCard} from '@/components/data-display/stat-card';
import {TableContainer} from '@/components/data-display/table-container';
import {SearchInput} from '@/components/forms/search-input';
import {PageTemplate} from '@/components/layout/page-template';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {ROUTES} from '@/constants/routes/paths';
import {useConfirm} from '@/contexts/feedback/confirm-context';
import {useToast} from '@/contexts/feedback/toast-context';
import type {CostCenterSelectOption} from '@/features/cost-centers/types';
import {formatCurrencyBr, formatDateBr} from '@/features/financial/utils/financial-format';
import {useNavPermissions} from '@/hooks/use-nav-permissions';
import {useSyncedListData} from '@/hooks/use-synced-list-data';
import {hasPermission} from '@/lib/navigation/has-permission';
import {MSG} from '@/lib/feedback/messages';

import {deletePayrollExpenseAction} from '../actions';
import type {
  PaginatedPayrollExpenses,
  PayrollExpense,
  PayrollListFilters,
  PayrollPersonOption,
  PayrollSortOptions,
  PayrollSummary,
  Position,
} from '../types';
import {
  PAYROLL_EXPENSE_STATUS_LABELS,
  PAYROLL_EXPENSE_TYPE_LABELS,
  PAYROLL_PERSON_KIND_LABELS,
} from '../types';
import {formatCompetenceBr} from '../utils/competence';
import {buildPayrollListUrl} from '../utils/list-url';
import {PayrollExpenseFormModal} from './payroll-expense-form-modal';
import {PayrollFilters} from './payroll-filters';

export interface PayrollListProps {
  initialData: PaginatedPayrollExpenses;
  summary: PayrollSummary;
  people: PayrollPersonOption[];
  positions: Position[];
  costCenters: CostCenterSelectOption[];
  initialSearch: string;
  initialFilters: PayrollListFilters;
  initialSort: PayrollSortOptions;
  highlightedExpenseId?: string | null;
  error: string | null;
}

function statusBadgeVariant(
  status: PayrollExpense['expenseStatus'],
): 'default' | 'secondary' | 'outline' {
  switch (status) {
    case 'paid':
      return 'default';
    case 'pending':
      return 'secondary';
    default:
      return 'outline';
  }
}

/**
 * Situação financeira vem de financial_entries: a baixa pode ter sido feita em
 * Contas a Pagar, que também sincroniza o status da despesa de origem.
 */
function financialLabel(expense: PayrollExpense): string {
  if (expense.expenseStatus === 'cancelled') return 'Sem lançamento';
  if (!expense.financialStatus) return 'Não lançado';

  switch (expense.financialStatus) {
    case 'paid':
      return 'Pago no financeiro';
    case 'overdue':
      return 'Vencido';
    case 'pending':
      return 'Em Contas a Pagar';
    case 'cancelled':
      return 'Cancelado';
    default:
      return expense.financialStatus;
  }
}

function PayrollList({
  initialData,
  summary,
  people,
  positions,
  costCenters,
  initialSearch,
  initialFilters,
  initialSort,
  highlightedExpenseId = null,
  error: initialError,
}: PayrollListProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [search, setSearch] = React.useState(initialSearch);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<PayrollExpense | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(initialError);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);
  const permissions = useNavPermissions();
  const canCreate = hasPermission('financeiro:create', permissions);
  const canUpdate = hasPermission('financeiro:update', permissions);
  const canDelete = hasPermission('financeiro:delete', permissions);

  const {data, removeItem} = useSyncedListData(initialData);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      if (search === initialSearch) return;
      router.push(
        buildPayrollListUrl({
          search,
          sourceId: highlightedExpenseId ?? undefined,
          page: 1,
          filters: initialFilters,
          sort: initialSort,
        }),
      );
    }, 300);
    return () => window.clearTimeout(timer);
  }, [
    search,
    initialSearch,
    initialFilters,
    initialSort,
    highlightedExpenseId,
    router,
  ]);

  function handlePageChange(page: number) {
    router.push(
      buildPayrollListUrl({
        search,
        sourceId: highlightedExpenseId ?? undefined,
        page,
        filters: initialFilters,
        sort: initialSort,
      }),
    );
  }

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(expense: PayrollExpense) {
    setEditing(expense);
    setModalOpen(true);
  }

  async function handleDelete(expense: PayrollExpense) {
    const confirmed = await confirm({
      title: 'Excluir despesa de pessoal',
      description:
        'A despesa será excluída e o lançamento financeiro correspondente será estornado. Deseja continuar?',
      confirmLabel: MSG.deleteConfirmLabel,
      variant: 'destructive',
    });
    if (!confirmed) return;

    setActionLoading(expense.id);
    setActionError(null);

    const result = await deletePayrollExpenseAction(expense.id);
    if (!result.success) {
      setActionError(result.error);
      toast.error(result.error);
    } else {
      toast.success(MSG.deletedFeminine('Despesa'));
      removeItem(expense.id);
    }
    setActionLoading(null);
    setOpenMenuId(null);
  }

  function handleSaved() {
    router.refresh();
  }

  const columns = [
    {
      id: 'competence',
      header: 'Competência',
      cell: (row: PayrollExpense) => formatCompetenceBr(row.competence),
    },
    {
      id: 'person',
      header: 'Funcionário',
      cell: (row: PayrollExpense) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{row.personName ?? '—'}</span>
          <span className="text-xs text-muted-foreground">
            {PAYROLL_PERSON_KIND_LABELS[row.personKind]}
          </span>
        </div>
      ),
    },
    {
      id: 'position',
      header: 'Cargo',
      cell: (row: PayrollExpense) => row.positionName ?? '—',
    },
    {
      id: 'expenseType',
      header: 'Tipo',
      cell: (row: PayrollExpense) => PAYROLL_EXPENSE_TYPE_LABELS[row.expenseType],
    },
    {
      id: 'amount',
      header: 'Valor',
      cell: (row: PayrollExpense) => (
        <span className="font-financial">{formatCurrencyBr(row.amount)}</span>
      ),
    },
    {
      id: 'costCenter',
      header: 'Centro de custo',
      cell: (row: PayrollExpense) => row.costCenterName ?? '—',
    },
    {
      id: 'dueDate',
      header: 'Vencimento',
      cell: (row: PayrollExpense) => formatDateBr(row.dueDate),
    },
    {
      id: 'expenseStatus',
      header: 'Status',
      cell: (row: PayrollExpense) => (
        <Badge variant={statusBadgeVariant(row.expenseStatus)}>
          {PAYROLL_EXPENSE_STATUS_LABELS[row.expenseStatus]}
        </Badge>
      ),
    },
    {
      id: 'financial',
      header: 'Financeiro',
      cell: (row: PayrollExpense) => (
        <span className="text-sm text-muted-foreground">{financialLabel(row)}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      className: 'w-12',
      cell: (row: PayrollExpense) => (
        <RowActionsMenu
          open={openMenuId === row.id}
          onOpenChange={(open) => setOpenMenuId(open ? row.id : null)}
          disabled={actionLoading === row.id}
        >
          {canUpdate ? (
            <RowActionsMenuItem
              onClick={() => {
                openEdit(row);
                setOpenMenuId(null);
              }}
            >
              <Pencil className="size-4" /> Editar
            </RowActionsMenuItem>
          ) : null}
          {row.financialEntryId ? (
            <Link
              href={ROUTES.contasAPagarDetail(row.financialEntryId)}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
              onClick={() => setOpenMenuId(null)}
            >
              <ExternalLink className="size-4" /> Ver lançamento
            </Link>
          ) : null}
          {canDelete ? (
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
      title="Despesas de Pessoal"
      description="Folha de motoristas e colaboradores — gera lançamento financeiro por centro de custo."
      actions={canCreate ? (
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" />
          Nova despesa
        </Button>
      ) : undefined}
    >
      {actionError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total da competência"
          value={formatCurrencyBr(summary.totalCompetence)}
          subtitle="Despesas ativas no filtro aplicado"
        />
        <StatCard
          title="Total pago"
          value={
            <span className="text-emerald-600 dark:text-emerald-400">
              {formatCurrencyBr(summary.totalPaid)}
            </span>
          }
          subtitle="Folha já quitada"
        />
        <StatCard
          title="Total pendente"
          value={
            <span className="text-red-600 dark:text-red-400">
              {formatCurrencyBr(summary.totalPending)}
            </span>
          }
          subtitle="Em aberto em Contas a Pagar"
        />
        <StatCard
          title="Funcionários"
          value={summary.peopleCount}
          subtitle="Pessoas com despesa no período"
        />
      </div>

      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <SearchInput
          value={search}
          onValueChange={setSearch}
          placeholder="Buscar por funcionário ou observação..."
          className="max-w-md"
        />
      </div>

      <PayrollFilters
        people={people}
        positions={positions}
        costCenters={costCenters}
        initialFilters={initialFilters}
        initialSort={initialSort}
      />

      <TableContainer className="mt-4">
        <DataTable
          columns={columns}
          data={data.items}
          getRowKey={(row) => row.id}
          getRowClassName={(row) =>
            row.id === highlightedExpenseId
              ? 'bg-primary/10 ring-1 ring-inset ring-primary/30'
              : undefined
          }
          emptyTitle="Nenhuma despesa de pessoal encontrada"
          emptyDescription="Lance salários, encargos e benefícios de motoristas e colaboradores."
          emptyAction={canCreate ? {label: 'Nova despesa', onClick: openCreate} : undefined}
        />
      </TableContainer>

      <ListPagination
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        totalPages={data.totalPages}
        itemLabel="despesa"
        onPageChange={handlePageChange}
      />

      <PayrollExpenseFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        expense={editing}
        people={people}
        positions={positions}
        costCenters={costCenters}
        onSaved={handleSaved}
      />
    </PageTemplate>
  );
}

export {PayrollList};
