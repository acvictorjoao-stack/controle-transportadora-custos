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

import {deleteVehicleAction, updateVehicleStatusAction} from '../actions';
import type {
  PaginatedVehicles,
  Vehicle,
  VehicleAssetStatus,
  VehicleListFilters,
  VehicleSortOptions,
} from '../types';
import {VEHICLE_ASSET_STATUS_LABELS} from '../types';
import {getVehicleAssetStatusVariant} from '../utils/asset-status';
import {buildVehiclesListUrl} from '../utils/list-url';
import {VehicleFilters} from './vehicle-filters';
import {VehicleFormModal} from './vehicle-form-modal';

export interface VehiclesListProps {
  initialData: PaginatedVehicles;
  initialSearch: string;
  initialFilters: VehicleListFilters;
  initialSort: VehicleSortOptions;
  branches: BranchSelectOption[];
  error: string | null;
}

function VehiclesList({
  initialData,
  initialSearch,
  initialFilters,
  initialSort,
  branches,
  error: initialError,
}: VehiclesListProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [search, setSearch] = React.useState(initialSearch);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingVehicle, setEditingVehicle] = React.useState<Vehicle | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(initialError);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);

  const data = initialData;

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      if (search === initialSearch) return;
      router.push(buildVehiclesListUrl({search, page: 1, filters: initialFilters, sort: initialSort}));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search, initialSearch, initialFilters, initialSort, router]);

  function handlePageChange(page: number) {
    router.push(buildVehiclesListUrl({search, page, filters: initialFilters, sort: initialSort}));
  }

  function openCreate() {
    setEditingVehicle(null);
    setModalOpen(true);
  }

  function openEdit(vehicle: Vehicle) {
    setEditingVehicle(vehicle);
    setModalOpen(true);
  }

  async function handleDelete(vehicle: Vehicle) {
    const confirmed = await confirm({
      title: 'Excluir veículo',
      description: `Excluir o veículo "${vehicle.plate}"? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      variant: 'destructive',
    });
    if (!confirmed) return;

    setActionLoading(vehicle.id);
    setActionError(null);

    const result = await deleteVehicleAction(vehicle.id);
    if (!result.success) {
      setActionError(result.error);
      toast.error(result.error);
    } else {
      toast.success('Veículo excluído com sucesso');
      router.refresh();
    }
    setActionLoading(null);
    setOpenMenuId(null);
  }

  async function handleStatusChange(vehicle: Vehicle, assetStatus: VehicleAssetStatus) {
    setActionLoading(vehicle.id);
    setActionError(null);

    const result = await updateVehicleStatusAction(vehicle.id, {assetStatus});
    if (!result.success) {
      setActionError(result.error);
      toast.error(result.error);
    } else {
      toast.success(`Veículo marcado como ${VEHICLE_ASSET_STATUS_LABELS[assetStatus]}`);
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
      id: 'plate',
      header: 'Placa',
      cell: (row: Vehicle) => (
        <Link
          href={ROUTES.veiculoDetail(row.id)}
          className="font-mono text-sm font-medium hover:underline"
        >
          {row.plate}
        </Link>
      ),
    },
    {
      id: 'fleetNumber',
      header: 'Frota',
      cell: (row: Vehicle) => row.fleetNumber ?? '—',
    },
    {
      id: 'vehicleType',
      header: 'Tipo',
      cell: (row: Vehicle) => row.vehicleType,
    },
    {
      id: 'bodyType',
      header: 'Implemento',
      cell: (row: Vehicle) => row.bodyType ?? '—',
    },
    {
      id: 'brand',
      header: 'Marca / Modelo',
      cell: (row: Vehicle) =>
        [row.brand, row.model].filter(Boolean).join(' ') || '—',
    },
    {
      id: 'branch',
      header: 'Filial',
      cell: (row: Vehicle) => row.branchName ?? '—',
    },
    {
      id: 'odometer',
      header: 'Hodômetro',
      cell: (row: Vehicle) =>
        `${row.currentOdometerKm.toLocaleString('pt-BR')} km`,
    },
    {
      id: 'assetStatus',
      header: 'Situação',
      cell: (row: Vehicle) => (
        <Badge variant={getVehicleAssetStatusVariant(row.assetStatus)}>
          {VEHICLE_ASSET_STATUS_LABELS[row.assetStatus]}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      className: 'w-12',
      cell: (row: Vehicle) => (
        <RowActionsMenu
          open={openMenuId === row.id}
          onOpenChange={(open) => setOpenMenuId(open ? row.id : null)}
          disabled={actionLoading === row.id}
        >
          <Link
            href={ROUTES.veiculoDetail(row.id)}
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
          {(Object.keys(VEHICLE_ASSET_STATUS_LABELS) as VehicleAssetStatus[])
            .filter((s) => s !== row.assetStatus)
            .map((status) => (
              <RowActionsMenuItem key={status} onClick={() => handleStatusChange(row, status)}>
                {VEHICLE_ASSET_STATUS_LABELS[status]}
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
      title="Veículos"
      description="Gerencie a frota de veículos da transportadora"
      actions={
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" />
          Novo veículo
        </Button>
      }
      actionBar={{
        leading: (
          <div className="flex w-full flex-col gap-3">
            <SearchInput
              value={search}
              onValueChange={setSearch}
              placeholder="Buscar por placa, frota, marca ou modelo..."
              className="w-full max-w-md"
            />
            <VehicleFilters
              branches={branches}
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
          emptyTitle="Nenhum veículo cadastrado"
          emptyDescription="Cadastre o primeiro veículo da sua frota."
          emptyAction={{label: 'Novo veículo', onClick: openCreate}}
        />
      </TableContainer>

      <ListPagination
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        totalPages={data.totalPages}
        itemLabel="veículo"
        onPageChange={handlePageChange}
      />

      <VehicleFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        vehicle={editingVehicle}
        branches={branches}
        onSaved={handleSaved}
      />
    </PageTemplate>
  );
}

export {VehiclesList};
