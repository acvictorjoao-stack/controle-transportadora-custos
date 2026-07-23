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
import type {VehicleSelectOption} from '@/features/vehicles/types';

import {deleteMaintenanceRecordAction} from '../actions';
import type {
  MaintenanceListFilters,
  MaintenanceRecord,
  MaintenanceSortOptions,
  PaginatedMaintenanceRecords,
} from '../types';
import {
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_TYPE_LABELS,
} from '../types';
import {
  formatCurrencyBr,
  formatDateTimeBr,
  formatHours,
} from '../utils/maintenance-format';
import {buildMaintenanceListUrl} from '../utils/list-url';
import {MaintenanceFilters} from './maintenance-filters';
import {MaintenanceFormModal} from './maintenance-form-modal';

export interface MaintenanceListProps {
  initialData: PaginatedMaintenanceRecords;
  initialSearch: string;
  initialFilters: MaintenanceListFilters;
  initialSort: MaintenanceSortOptions;
  branches: BranchSelectOption[];
  vehicles: VehicleSelectOption[];
  error: string | null;
}

function statusVariant(status: MaintenanceRecord['maintenanceStatus']) {
  if (status === 'completed') return 'secondary' as const;
  if (status === 'cancelled') return 'outline' as const;
  if (status === 'waiting_parts') return 'destructive' as const;
  return 'default' as const;
}

function MaintenanceList({
  initialData,
  initialSearch,
  initialFilters,
  initialSort,
  branches,
  vehicles,
  error: initialError,
}: MaintenanceListProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [search, setSearch] = React.useState(initialSearch);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingRecord, setEditingRecord] = React.useState<MaintenanceRecord | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(initialError);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);

  const data = initialData;

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      if (search === initialSearch) return;
      router.push(buildMaintenanceListUrl({search, page: 1, filters: initialFilters, sort: initialSort}));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search, initialSearch, initialFilters, initialSort, router]);

  function handlePageChange(page: number) {
    router.push(buildMaintenanceListUrl({search, page, filters: initialFilters, sort: initialSort}));
  }

  function openCreate() {
    setEditingRecord(null);
    setModalOpen(true);
  }

  function openEdit(record: MaintenanceRecord) {
    setEditingRecord(record);
    setModalOpen(true);
  }

  async function handleDelete(record: MaintenanceRecord) {
    const confirmed = await confirm({
      title: 'Excluir manutenção',
      description: 'Excluir esta manutenção? Esta ação não pode ser desfeita.',
      confirmLabel: 'Excluir',
      variant: 'destructive',
    });
    if (!confirmed) return;

    setActionLoading(record.id);
    setActionError(null);

    const result = await deleteMaintenanceRecordAction(record.id);
    if (!result.success) {
      setActionError(result.error);
      toast.error(result.error);
    } else {
      toast.success('Manutenção excluída com sucesso');
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
      id: 'openedAt',
      header: 'Abertura',
      cell: (row: MaintenanceRecord) => formatDateTimeBr(row.openedAt),
    },
    {
      id: 'vehicle',
      header: 'Veículo',
      cell: (row: MaintenanceRecord) => (
        <Link
          href={ROUTES.manutencaoDetail(row.id)}
          className="font-mono text-sm font-medium hover:underline"
        >
          {row.vehiclePlate ?? '—'}
        </Link>
      ),
    },
    {
      id: 'type',
      header: 'Tipo',
      cell: (row: MaintenanceRecord) => MAINTENANCE_TYPE_LABELS[row.maintenanceType] ?? row.maintenanceType,
    },
    {
      id: 'supplier',
      header: 'Fornecedor',
      cell: (row: MaintenanceRecord) => row.supplier ?? '—',
    },
    {
      id: 'totalCost',
      header: 'Custo',
      cell: (row: MaintenanceRecord) => formatCurrencyBr(row.totalCost),
    },
    {
      id: 'downtime',
      header: 'Parado',
      cell: (row: MaintenanceRecord) => formatHours(row.downtimeHours),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row: MaintenanceRecord) => (
        <Badge variant={statusVariant(row.maintenanceStatus)}>
          {MAINTENANCE_STATUS_LABELS[row.maintenanceStatus] ?? row.maintenanceStatus}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      className: 'w-12',
      cell: (row: MaintenanceRecord) => (
        <RowActionsMenu
          open={openMenuId === row.id}
          onOpenChange={(open) => setOpenMenuId(open ? row.id : null)}
          disabled={actionLoading === row.id}
        >
          <Link
            href={ROUTES.manutencaoDetail(row.id)}
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
      title="Manutenções"
      description="Gestão de manutenções preventivas e corretivas da frota"
      actions={
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" />
          Nova manutenção
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
          placeholder="Buscar por fornecedor, oficina, descrição ou responsável..."
          className="max-w-md"
        />
      </div>

      <MaintenanceFilters
        branches={branches}
        vehicles={vehicles}
        initialFilters={initialFilters}
        initialSort={initialSort}
      />

      <TableContainer className="mt-4">
        <DataTable
          columns={columns}
          data={data.items}
          getRowKey={(row) => row.id}
          emptyTitle="Nenhuma manutenção encontrada"
          emptyDescription="Cadastre a primeira manutenção da frota."
          emptyAction={{label: 'Nova manutenção', onClick: openCreate}}
        />
      </TableContainer>

      <ListPagination
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        totalPages={data.totalPages}
        itemLabel="manutenção"
        onPageChange={handlePageChange}
      />

      <MaintenanceFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        record={editingRecord}
        vehicles={vehicles}
        onSaved={handleSaved}
      />
    </PageTemplate>
  );
}

export {MaintenanceList};
