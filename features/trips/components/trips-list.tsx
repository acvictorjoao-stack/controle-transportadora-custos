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
import type {Customer} from '@/features/customers/types';
import type {BranchSelectOption} from '@/features/organization/branches/types';
import type {DriverSelectOption} from '@/features/drivers/types';
import type {VehicleSelectOption} from '@/features/vehicles/types';

import {deleteTripAction, updateTripStatusAction} from '../actions';
import type {
  PaginatedTrips,
  Trip,
  TripListFilters,
  TripSortOptions,
  TripStatus,
} from '../types';
import {TRIP_STATUS_LABELS} from '../types';
import {formatDateTimeBr, getTripStatusVariant} from '../utils/trip-status';
import {buildTripsListUrl} from '../utils/list-url';
import {TripFilters} from './trip-filters';
import {TripFormModal} from './trip-form-modal';

export interface TripsListProps {
  initialData: PaginatedTrips;
  initialSearch: string;
  initialFilters: TripListFilters;
  initialSort: TripSortOptions;
  branches: BranchSelectOption[];
  drivers: DriverSelectOption[];
  vehicles: VehicleSelectOption[];
  customers: Customer[];
  error: string | null;
}

function TripsList({
  initialData,
  initialSearch,
  initialFilters,
  initialSort,
  branches,
  drivers,
  vehicles,
  customers,
  error: initialError,
}: TripsListProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [search, setSearch] = React.useState(initialSearch);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingTrip, setEditingTrip] = React.useState<Trip | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(initialError);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);

  const data = initialData;

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      if (search === initialSearch) return;
      router.push(buildTripsListUrl({search, page: 1, filters: initialFilters, sort: initialSort}));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search, initialSearch, initialFilters, initialSort, router]);

  function handlePageChange(page: number) {
    router.push(buildTripsListUrl({search, page, filters: initialFilters, sort: initialSort}));
  }

  function openCreate() {
    setEditingTrip(null);
    setModalOpen(true);
  }

  function openEdit(trip: Trip) {
    setEditingTrip(trip);
    setModalOpen(true);
  }

  async function handleDelete(trip: Trip) {
    const confirmed = await confirm({
      title: 'Excluir viagem',
      description: `Excluir a viagem "${trip.tripNumber}"? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      variant: 'destructive',
    });
    if (!confirmed) return;

    setActionLoading(trip.id);
    setActionError(null);

    const result = await deleteTripAction(trip.id);
    if (!result.success) {
      setActionError(result.error);
      toast.error(result.error);
    } else {
      toast.success('Viagem excluída com sucesso');
      router.refresh();
    }
    setActionLoading(null);
    setOpenMenuId(null);
  }

  async function handleStatusChange(trip: Trip, tripStatus: TripStatus) {
    setActionLoading(trip.id);
    setActionError(null);

    const result = await updateTripStatusAction(trip.id, {tripStatus});
    if (!result.success) {
      setActionError(result.error);
      toast.error(result.error);
    } else {
      toast.success(`Viagem marcada como ${TRIP_STATUS_LABELS[tripStatus]}`);
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
      id: 'tripNumber',
      header: 'Número',
      cell: (row: Trip) => (
        <Link
          href={ROUTES.viagemDetail(row.id)}
          className="font-mono text-sm font-medium hover:underline"
        >
          {row.tripNumber}
        </Link>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row: Trip) => (
        <Badge variant={getTripStatusVariant(row.tripStatus)}>
          {TRIP_STATUS_LABELS[row.tripStatus]}
        </Badge>
      ),
    },
    {
      id: 'driver',
      header: 'Motorista',
      cell: (row: Trip) => row.driverName ?? '—',
    },
    {
      id: 'vehicle',
      header: 'Veículo',
      cell: (row: Trip) => row.vehiclePlate ?? '—',
    },
    {
      id: 'client',
      header: 'Cliente',
      cell: (row: Trip) => row.customerName ?? row.clientName ?? '—',
    },
    {
      id: 'route',
      header: 'Origem → Destino',
      cell: (row: Trip) =>
        [row.origin, row.destination].filter(Boolean).join(' → ') || '—',
    },
    {
      id: 'departedAt',
      header: 'Saída',
      cell: (row: Trip) => formatDateTimeBr(row.departedAt),
    },
    {
      id: 'branch',
      header: 'Filial',
      cell: (row: Trip) => row.branchName ?? '—',
    },
    {
      id: 'actions',
      header: '',
      className: 'w-12',
      cell: (row: Trip) => (
        <RowActionsMenu
          open={openMenuId === row.id}
          onOpenChange={(open) => setOpenMenuId(open ? row.id : null)}
          disabled={actionLoading === row.id}
        >
          <Link
            href={ROUTES.viagemDetail(row.id)}
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
          {(['in_progress', 'completed', 'cancelled'] as TripStatus[])
            .filter((s) => s !== row.tripStatus)
            .map((status) => (
              <RowActionsMenuItem key={status} onClick={() => handleStatusChange(row, status)}>
                {TRIP_STATUS_LABELS[status]}
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
      title="Viagens"
      description="Gerencie viagens operacionais da frota"
      actions={
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" />
          Nova viagem
        </Button>
      }
      actionBar={{
        leading: (
          <div className="flex w-full flex-col gap-3">
            <SearchInput
              value={search}
              onValueChange={setSearch}
              placeholder="Buscar por número, cliente, origem ou destino..."
              className="w-full max-w-md"
            />
            <TripFilters
              branches={branches}
              drivers={drivers}
              vehicles={vehicles}
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
          emptyTitle="Nenhuma viagem cadastrada"
          emptyDescription="Cadastre a primeira viagem operacional."
          emptyAction={{label: 'Nova viagem', onClick: openCreate}}
        />
      </TableContainer>

      <ListPagination
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        totalPages={data.totalPages}
        itemLabel="viagem"
        onPageChange={handlePageChange}
      />

      <TripFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        trip={editingTrip}
        branches={branches}
        drivers={drivers}
        vehicles={vehicles}
        customers={customers}
        onSaved={handleSaved}
      />
    </PageTemplate>
  );
}

export {TripsList};
