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

import {deleteTireAction} from '../actions';
import type {PaginatedTires, Tire, TireListFilters, TireSortOptions} from '../types';
import {TIRE_POSITION_LABELS, TIRE_STATUS_LABELS} from '../types';
import {formatCurrencyBr, formatKm} from '../utils/tire-format';
import {buildTiresListUrl} from '../utils/list-url';
import {TireFilters} from './tire-filters';
import {TireFormModal} from './tire-form-modal';

export interface TiresListProps {
  initialData: PaginatedTires;
  initialSearch: string;
  initialFilters: TireListFilters;
  initialSort: TireSortOptions;
  branches: BranchSelectOption[];
  vehicles: VehicleSelectOption[];
  error: string | null;
}

function statusVariant(status: Tire['tireStatus']) {
  if (status === 'installed') return 'default' as const;
  if (status === 'discarded') return 'destructive' as const;
  if (status === 'in_retread') return 'secondary' as const;
  return 'outline' as const;
}

function TiresList({
  initialData,
  initialSearch,
  initialFilters,
  initialSort,
  branches,
  vehicles,
  error: initialError,
}: TiresListProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [search, setSearch] = React.useState(initialSearch);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingTire, setEditingTire] = React.useState<Tire | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(initialError);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);

  const data = initialData;

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      if (search === initialSearch) return;
      router.push(buildTiresListUrl({search, page: 1, filters: initialFilters, sort: initialSort}));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search, initialSearch, initialFilters, initialSort, router]);

  function handlePageChange(page: number) {
    router.push(buildTiresListUrl({search, page, filters: initialFilters, sort: initialSort}));
  }

  function openCreate() {
    setEditingTire(null);
    setModalOpen(true);
  }

  function openEdit(tire: Tire) {
    setEditingTire(tire);
    setModalOpen(true);
  }

  async function handleDelete(tire: Tire) {
    const confirmed = await confirm({
      title: 'Excluir pneu',
      description: 'Excluir este pneu? Esta ação não pode ser desfeita.',
      confirmLabel: 'Excluir',
      variant: 'destructive',
    });
    if (!confirmed) return;

    setActionLoading(tire.id);
    setActionError(null);

    const result = await deleteTireAction(tire.id);
    if (!result.success) {
      setActionError(result.error);
      toast.error(result.error);
    } else {
      toast.success('Pneu excluído com sucesso');
      router.refresh();
    }
    setActionLoading(null);
    setOpenMenuId(null);
  }

  function handleSaved() {
    setModalOpen(false);
    router.refresh();
  }

  const columns = [
    {
      id: 'asset',
      header: 'Patrimônio',
      cell: (tire: Tire) => tire.assetNumber ?? tire.internalCode ?? '—',
    },
    {
      id: 'brand',
      header: 'Marca / Modelo',
      cell: (tire: Tire) => `${tire.brand ?? '—'} ${tire.model ?? ''}`.trim(),
    },
    {
      id: 'size',
      header: 'Medida',
      cell: (tire: Tire) => tire.tireSize ?? '—',
    },
    {
      id: 'vehicle',
      header: 'Veículo',
      cell: (tire: Tire) => tire.vehiclePlate ?? '—',
    },
    {
      id: 'position',
      header: 'Posição',
      cell: (tire: Tire) =>
        tire.currentPosition ? TIRE_POSITION_LABELS[tire.currentPosition] : '—',
    },
    {
      id: 'status',
      header: 'Status',
      cell: (tire: Tire) => (
        <Badge variant={statusVariant(tire.tireStatus)}>
          {TIRE_STATUS_LABELS[tire.tireStatus]}
        </Badge>
      ),
    },
    {
      id: 'km',
      header: 'KM acumulado',
      cell: (tire: Tire) => formatKm(tire.accumulatedKm),
    },
    {
      id: 'recaps',
      header: 'Recapagens',
      cell: (tire: Tire) => tire.recapCount,
    },
    {
      id: 'cost',
      header: 'Custo/KM',
      cell: (tire: Tire) => formatCurrencyBr(tire.costPerKm),
    },
    {
      id: 'actions',
      header: '',
      cell: (tire: Tire) => (
        <RowActionsMenu
          open={openMenuId === tire.id}
          onOpenChange={(open) => setOpenMenuId(open ? tire.id : null)}
          disabled={actionLoading === tire.id}
        >
          <Link
            href={ROUTES.pneuDetail(tire.id)}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
            onClick={() => setOpenMenuId(null)}
          >
            <Eye className="size-4" /> Ver
          </Link>
          <RowActionsMenuItem
            onClick={() => {
              setOpenMenuId(null);
              openEdit(tire);
            }}
          >
            <Pencil className="size-4" /> Editar
          </RowActionsMenuItem>
          <RowActionsMenuItem destructive onClick={() => handleDelete(tire)}>
            <Trash2 className="size-4" /> Excluir
          </RowActionsMenuItem>
        </RowActionsMenu>
      ),
    },
  ];

  return (
    <PageTemplate
      title="Pneus"
      description="Gestão completa de pneus da frota"
      actions={
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          Novo pneu
        </Button>
      }
    >
      {actionError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      <div className="mb-4 space-y-4">
        <SearchInput
          value={search}
          onValueChange={setSearch}
          placeholder="Buscar por patrimônio, marca, fornecedor..."
        />
        <TireFilters
          branches={branches}
          vehicles={vehicles.map((v) => ({id: v.id, plate: v.plate}))}
          initialFilters={initialFilters}
          initialSort={initialSort}
        />
      </div>

      <TableContainer>
        <DataTable
          columns={columns}
          data={data.items}
          getRowKey={(row) => row.id}
          emptyTitle="Nenhum pneu encontrado"
          emptyDescription="Cadastre o primeiro pneu da frota."
          emptyAction={{label: 'Novo pneu', onClick: openCreate}}
        />
      </TableContainer>

      <ListPagination
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        totalPages={data.totalPages}
        itemLabel="pneu"
        onPageChange={handlePageChange}
      />

      <TireFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        tire={editingTire}
        branches={branches}
        vehicles={vehicles}
        onSaved={handleSaved}
      />
    </PageTemplate>
  );
}

export {TiresList};
