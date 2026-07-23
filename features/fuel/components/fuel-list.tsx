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
import type {SupplierSelectOption} from '@/features/suppliers/types';
import type {VehicleSelectOption} from '@/features/vehicles/types';

import {deleteFuelRecordAction} from '../actions';
import type {
  FuelListFilters,
  FuelRecord,
  FuelSortOptions,
  PaginatedFuelRecords,
} from '../types';
import {FUEL_TYPE_LABELS} from '../types';
import {
  formatCurrencyBr,
  formatDateTimeBr,
  formatKmPerLiter,
  formatLiters,
} from '../utils/fuel-format';
import {buildFuelListUrl} from '../utils/list-url';
import {FuelFilters} from './fuel-filters';
import {FuelFormModal} from './fuel-form-modal';

export interface FuelListProps {
  initialData: PaginatedFuelRecords;
  initialSearch: string;
  initialFilters: FuelListFilters;
  initialSort: FuelSortOptions;
  branches: BranchSelectOption[];
  drivers: DriverSelectOption[];
  vehicles: VehicleSelectOption[];
  suppliers: SupplierSelectOption[];
  error: string | null;
}

function FuelList({
  initialData,
  initialSearch,
  initialFilters,
  initialSort,
  branches,
  drivers,
  vehicles,
  suppliers,
  error: initialError,
}: FuelListProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [search, setSearch] = React.useState(initialSearch);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingRecord, setEditingRecord] = React.useState<FuelRecord | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(initialError);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);

  const data = initialData;

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      if (search === initialSearch) return;
      router.push(buildFuelListUrl({search, page: 1, filters: initialFilters, sort: initialSort}));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search, initialSearch, initialFilters, initialSort, router]);

  function handlePageChange(page: number) {
    router.push(buildFuelListUrl({search, page, filters: initialFilters, sort: initialSort}));
  }

  function openCreate() {
    setEditingRecord(null);
    setModalOpen(true);
  }

  function openEdit(record: FuelRecord) {
    setEditingRecord(record);
    setModalOpen(true);
  }

  async function handleDelete(record: FuelRecord) {
    const confirmed = await confirm({
      title: 'Excluir abastecimento',
      description: 'Excluir este abastecimento? Esta ação não pode ser desfeita.',
      confirmLabel: 'Excluir',
      variant: 'destructive',
    });
    if (!confirmed) return;

    setActionLoading(record.id);
    setActionError(null);

    const result = await deleteFuelRecordAction(record.id);
    if (!result.success) {
      setActionError(result.error);
      toast.error(result.error);
    } else {
      toast.success('Abastecimento excluído com sucesso');
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
      id: 'fueledAt',
      header: 'Data',
      cell: (row: FuelRecord) => formatDateTimeBr(row.fueledAt),
    },
    {
      id: 'vehicle',
      header: 'Veículo',
      cell: (row: FuelRecord) => (
        <Link
          href={ROUTES.abastecimentoDetail(row.id)}
          className="font-mono text-sm font-medium hover:underline"
        >
          {row.vehiclePlate ?? '—'}
        </Link>
      ),
    },
    {
      id: 'driver',
      header: 'Motorista',
      cell: (row: FuelRecord) => row.driverName ?? '—',
    },
    {
      id: 'station',
      header: 'Posto',
      cell: (row: FuelRecord) => row.stationName ?? '—',
    },
    {
      id: 'fuelType',
      header: 'Combustível',
      cell: (row: FuelRecord) => FUEL_TYPE_LABELS[row.fuelType] ?? row.fuelType,
    },
    {
      id: 'liters',
      header: 'Litros',
      cell: (row: FuelRecord) => formatLiters(row.quantityLiters),
    },
    {
      id: 'total',
      header: 'Valor',
      cell: (row: FuelRecord) => formatCurrencyBr(row.totalAmount),
    },
    {
      id: 'kmPerLiter',
      header: 'KM/L',
      cell: (row: FuelRecord) => formatKmPerLiter(row.kmPerLiter),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row: FuelRecord) =>
        row.isInconsistent ? (
          <Badge variant="destructive">Inconsistente</Badge>
        ) : (
          <Badge variant="secondary">OK</Badge>
        ),
    },
    {
      id: 'actions',
      header: '',
      className: 'w-12',
      cell: (row: FuelRecord) => (
        <RowActionsMenu
          open={openMenuId === row.id}
          onOpenChange={(open) => setOpenMenuId(open ? row.id : null)}
          disabled={actionLoading === row.id}
        >
          <Link
            href={ROUTES.abastecimentoDetail(row.id)}
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
      title="Abastecimentos"
      description="Registro e análise de abastecimentos da frota"
      actions={
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" />
          Novo abastecimento
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
          placeholder="Buscar por posto, bandeira, cidade ou responsável..."
          className="max-w-md"
        />
      </div>

      <FuelFilters
        branches={branches}
        drivers={drivers}
        vehicles={vehicles}
        initialFilters={initialFilters}
        initialSort={initialSort}
      />

      <TableContainer className="mt-4">
        <DataTable
          columns={columns}
          data={data.items}
          getRowKey={(row) => row.id}
          emptyTitle="Nenhum abastecimento encontrado"
          emptyDescription="Cadastre o primeiro abastecimento da frota."
          emptyAction={{label: 'Novo abastecimento', onClick: openCreate}}
        />
      </TableContainer>

      <ListPagination
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        totalPages={data.totalPages}
        itemLabel="abastecimento"
        onPageChange={handlePageChange}
      />

      <FuelFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        record={editingRecord}
        branches={branches}
        drivers={drivers}
        vehicles={vehicles}
        suppliers={suppliers}
        onSaved={handleSaved}
      />
    </PageTemplate>
  );
}

export {FuelList};
