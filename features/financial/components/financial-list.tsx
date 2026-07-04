'use client';

import {Eye, Pencil, Plus, Trash2} from 'lucide-react';
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
import type {BranchSelectOption} from '@/features/organization/branches/types';
import type {DriverSelectOption} from '@/features/drivers/types';
import type {VehicleSelectOption} from '@/features/vehicles/types';
import type {TripSelectOption} from '@/features/trips/types';

import {deleteFinancialEntryAction} from '../actions';
import type {
  FinancialCategory,
  FinancialCostCenter,
  FinancialEntry,
  FinancialEntryStatus,
  FinancialListFilters,
  FinancialSortOptions,
  PaginatedFinancialEntries,
} from '../types';
import {
  FINANCIAL_ENTRY_STATUS_LABELS,
  FINANCIAL_ENTRY_TYPE_LABELS,
} from '../types/financial-entry';
import {formatCurrencyBr, formatDateBr} from '../utils/financial-format';
import {buildFinancialListUrl} from '../utils/list-url';
import {FinancialFilters} from './financial-filters';
import {FinancialFormModal} from './financial-form-modal';

export interface FinancialListProps {
  initialData: PaginatedFinancialEntries;
  initialSearch: string;
  initialFilters: FinancialListFilters;
  initialSort: FinancialSortOptions;
  branches: BranchSelectOption[];
  drivers: DriverSelectOption[];
  vehicles: VehicleSelectOption[];
  trips: TripSelectOption[];
  categories: FinancialCategory[];
  costCenters: FinancialCostCenter[];
  error: string | null;
}

function statusBadgeVariant(
  status: FinancialEntryStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'paid':
      return 'default';
    case 'pending':
      return 'secondary';
    case 'overdue':
    case 'reversed':
      return 'destructive';
    default:
      return 'outline';
  }
}

function FinancialList({
  initialData,
  initialSearch,
  initialFilters,
  initialSort,
  branches,
  drivers,
  vehicles,
  trips,
  categories,
  costCenters,
  error: initialError,
}: FinancialListProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [search, setSearch] = React.useState(initialSearch);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingEntry, setEditingEntry] = React.useState<FinancialEntry | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(initialError);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);

  const data = initialData;

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      if (search === initialSearch) return;
      router.push(
        buildFinancialListUrl({search, page: 1, filters: initialFilters, sort: initialSort}),
      );
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search, initialSearch, initialFilters, initialSort, router]);

  function handlePageChange(page: number) {
    router.push(buildFinancialListUrl({search, page, filters: initialFilters, sort: initialSort}));
  }

  function openCreate() {
    setEditingEntry(null);
    setModalOpen(true);
  }

  function openEdit(entry: FinancialEntry) {
    setEditingEntry(entry);
    setModalOpen(true);
  }

  async function handleDelete(entry: FinancialEntry) {
    const confirmed = await confirm({
      title: 'Excluir lançamento',
      description: 'Excluir este lançamento? Esta ação não pode ser desfeita.',
      confirmLabel: 'Excluir',
      variant: 'destructive',
    });
    if (!confirmed) return;

    setActionLoading(entry.id);
    setActionError(null);

    const result = await deleteFinancialEntryAction(entry.id);
    if (!result.success) {
      setActionError(result.error);
      toast.error(result.error);
    } else {
      toast.success('Lançamento excluído com sucesso');
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
      id: 'entryDate',
      header: 'Data',
      cell: (row: FinancialEntry) => formatDateBr(row.entryDate),
    },
    {
      id: 'description',
      header: 'Descrição',
      cell: (row: FinancialEntry) => (
        <Link
          href={ROUTES.financeiroDetail(row.id)}
          className="text-sm font-medium hover:underline"
        >
          {row.description ?? row.referenceNumber ?? '—'}
        </Link>
      ),
    },
    {
      id: 'category',
      header: 'Categoria',
      cell: (row: FinancialEntry) => row.categoryName ?? '—',
    },
    {
      id: 'entryType',
      header: 'Tipo',
      cell: (row: FinancialEntry) =>
        FINANCIAL_ENTRY_TYPE_LABELS[row.entryType] ?? row.entryType,
    },
    {
      id: 'amount',
      header: 'Valor',
      cell: (row: FinancialEntry) => formatCurrencyBr(row.amount, row.currency),
    },
    {
      id: 'entryStatus',
      header: 'Status',
      cell: (row: FinancialEntry) => (
        <Badge variant={statusBadgeVariant(row.entryStatus)}>
          {FINANCIAL_ENTRY_STATUS_LABELS[row.entryStatus] ?? row.entryStatus}
        </Badge>
      ),
    },
    {
      id: 'costCenter',
      header: 'Centro de custo',
      cell: (row: FinancialEntry) => row.costCenterName ?? '—',
    },
    {
      id: 'vehicle',
      header: 'Veículo',
      cell: (row: FinancialEntry) => row.vehiclePlate ?? '—',
    },
    {
      id: 'actions',
      header: '',
      className: 'w-12',
      cell: (row: FinancialEntry) => (
        <RowActionsMenu
          open={openMenuId === row.id}
          onOpenChange={(open) => setOpenMenuId(open ? row.id : null)}
          disabled={actionLoading === row.id}
        >
          <Link
            href={ROUTES.financeiroDetail(row.id)}
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
          <RowActionsMenuItem destructive onClick={() => handleDelete(row)}>
            <Trash2 className="size-4" /> Excluir
          </RowActionsMenuItem>
        </RowActionsMenu>
      ),
    },
  ];

  return (
    <PageTemplate
      title="Financeiro"
      description="Lançamentos financeiros, receitas e despesas da operação"
      actions={
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" />
          Novo lançamento
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
          placeholder="Buscar por descrição, referência, categoria ou centro de custo..."
          className="max-w-md"
        />
      </div>

      <FinancialFilters
        branches={branches}
        drivers={drivers}
        vehicles={vehicles}
        trips={trips}
        categories={categories}
        costCenters={costCenters}
        initialFilters={initialFilters}
        initialSort={initialSort}
      />

      <TableContainer className="mt-4">
        <DataTable
          columns={columns}
          data={data.items}
          getRowKey={(row) => row.id}
          emptyTitle="Nenhum lançamento encontrado"
          emptyDescription="Cadastre o primeiro lançamento financeiro."
          emptyAction={{label: 'Novo lançamento', onClick: openCreate}}
        />
      </TableContainer>

      <ListPagination
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        totalPages={data.totalPages}
        itemLabel="lançamento"
        onPageChange={handlePageChange}
      />

      <FinancialFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        entry={editingEntry}
        branches={branches}
        drivers={drivers}
        vehicles={vehicles}
        trips={trips}
        categories={categories}
        costCenters={costCenters}
        onSaved={handleSaved}
      />
    </PageTemplate>
  );
}

export {FinancialList};
