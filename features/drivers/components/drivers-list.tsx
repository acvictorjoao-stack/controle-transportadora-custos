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

import {deleteDriverAction, updateDriverStatusAction} from '../actions';
import type {
  Driver,
  DriverListFilters,
  DriverOperationalStatus,
  DriverSortOptions,
  PaginatedDrivers,
} from '../types';
import {DRIVER_OPERATIONAL_STATUS_LABELS} from '../types';
import {
  formatCpf,
  formatDateBr,
  getDriverOperationalStatusVariant,
  isCnhExpired,
  isCnhExpiring,
} from '../utils/driver-status';
import {buildDriversListUrl} from '../utils/list-url';
import {DriverFilters} from './driver-filters';
import {DriverFormModal} from './driver-form-modal';

export interface DriversListProps {
  initialData: PaginatedDrivers;
  initialSearch: string;
  initialFilters: DriverListFilters;
  initialSort: DriverSortOptions;
  branches: BranchSelectOption[];
  error: string | null;
}

function DriversList({
  initialData,
  initialSearch,
  initialFilters,
  initialSort,
  branches,
  error: initialError,
}: DriversListProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [search, setSearch] = React.useState(initialSearch);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingDriver, setEditingDriver] = React.useState<Driver | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(initialError);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);

  const data = initialData;

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      if (search === initialSearch) return;
      router.push(buildDriversListUrl({search, page: 1, filters: initialFilters, sort: initialSort}));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search, initialSearch, initialFilters, initialSort, router]);

  function handlePageChange(page: number) {
    router.push(buildDriversListUrl({search, page, filters: initialFilters, sort: initialSort}));
  }

  function openCreate() {
    setEditingDriver(null);
    setModalOpen(true);
  }

  function openEdit(driver: Driver) {
    setEditingDriver(driver);
    setModalOpen(true);
  }

  async function handleDelete(driver: Driver) {
    const confirmed = await confirm({
      title: 'Excluir motorista',
      description: `Excluir o motorista "${driver.name}"? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      variant: 'destructive',
    });
    if (!confirmed) return;

    setActionLoading(driver.id);
    setActionError(null);

    const result = await deleteDriverAction(driver.id);
    if (!result.success) {
      setActionError(result.error);
      toast.error(result.error);
    } else {
      toast.success('Motorista excluído com sucesso');
      router.refresh();
    }
    setActionLoading(null);
    setOpenMenuId(null);
  }

  async function handleStatusChange(driver: Driver, operationalStatus: DriverOperationalStatus) {
    setActionLoading(driver.id);
    setActionError(null);

    const result = await updateDriverStatusAction(driver.id, {operationalStatus});
    if (!result.success) {
      setActionError(result.error);
      toast.error(result.error);
    } else {
      toast.success(`Motorista marcado como ${DRIVER_OPERATIONAL_STATUS_LABELS[operationalStatus]}`);
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
      id: 'name',
      header: 'Nome',
      cell: (row: Driver) => (
        <Link
          href={ROUTES.motoristaDetail(row.id)}
          className="font-medium hover:underline"
        >
          {row.name}
        </Link>
      ),
    },
    {
      id: 'cpf',
      header: 'CPF',
      cell: (row: Driver) => formatCpf(row.cpf),
    },
    {
      id: 'cnh',
      header: 'CNH',
      cell: (row: Driver) => row.cnhNumber,
    },
    {
      id: 'category',
      header: 'Categoria',
      cell: (row: Driver) => row.licenseCategory,
    },
    {
      id: 'licenseExpires',
      header: 'Validade CNH',
      cell: (row: Driver) => {
        const label = formatDateBr(row.licenseExpiresAt);
        if (isCnhExpired(row.licenseExpiresAt)) {
          return <Badge variant="destructive">{label}</Badge>;
        }
        if (isCnhExpiring(row.licenseExpiresAt)) {
          return <Badge variant="outline">{label}</Badge>;
        }
        return label;
      },
    },
    {
      id: 'branch',
      header: 'Filial',
      cell: (row: Driver) => row.branchName ?? '—',
    },
    {
      id: 'ear',
      header: 'EAR',
      cell: (row: Driver) =>
        row.ear ? (
          <Badge variant="default">Sim</Badge>
        ) : (
          <Badge variant="secondary">Não</Badge>
        ),
    },
    {
      id: 'operationalStatus',
      header: 'Situação',
      cell: (row: Driver) => (
        <Badge variant={getDriverOperationalStatusVariant(row.operationalStatus)}>
          {DRIVER_OPERATIONAL_STATUS_LABELS[row.operationalStatus]}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      className: 'w-12',
      cell: (row: Driver) => (
        <RowActionsMenu
          open={openMenuId === row.id}
          onOpenChange={(open) => setOpenMenuId(open ? row.id : null)}
          disabled={actionLoading === row.id}
        >
          <Link
            href={ROUTES.motoristaDetail(row.id)}
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
          {(Object.keys(DRIVER_OPERATIONAL_STATUS_LABELS) as DriverOperationalStatus[])
            .filter((s) => s !== row.operationalStatus)
            .map((status) => (
              <RowActionsMenuItem key={status} onClick={() => handleStatusChange(row, status)}>
                {DRIVER_OPERATIONAL_STATUS_LABELS[status]}
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
      title="Motoristas"
      description="Gerencie a equipe de motoristas da transportadora"
      actions={
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" />
          Novo motorista
        </Button>
      }
      actionBar={{
        leading: (
          <div className="flex w-full flex-col gap-3">
            <SearchInput
              value={search}
              onValueChange={setSearch}
              placeholder="Buscar por nome, CPF, CNH ou telefone..."
              className="w-full max-w-md"
            />
            <DriverFilters
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
          emptyTitle="Nenhum motorista cadastrado"
          emptyDescription="Cadastre o primeiro motorista da sua equipe."
          emptyAction={{label: 'Novo motorista', onClick: openCreate}}
        />
      </TableContainer>

      <ListPagination
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        totalPages={data.totalPages}
        itemLabel="motorista"
        onPageChange={handlePageChange}
      />

      <DriverFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        driver={editingDriver}
        branches={branches}
        onSaved={handleSaved}
      />
    </PageTemplate>
  );
}

export {DriversList};
