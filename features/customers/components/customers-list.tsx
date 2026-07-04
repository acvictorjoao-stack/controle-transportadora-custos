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

import {deleteCustomerAction, updateCustomerStatusAction} from '../actions';
import type {
  Customer,
  CustomerListFilters,
  CustomerSortOptions,
  CustomerStatus,
  PaginatedCustomers,
} from '../types';
import {CUSTOMER_SEGMENT_LABELS, CUSTOMER_STATUS_LABELS} from '../types';
import {formatCnpj, getCustomerStatusVariant} from '../utils/customer-format';
import {buildCustomersListUrl} from '../utils/list-url';
import {CustomerFilters} from './customer-filters';
import {CustomerFormModal} from './customer-form-modal';

export interface CustomersListProps {
  initialData: PaginatedCustomers;
  initialSearch: string;
  initialFilters: CustomerListFilters;
  initialSort: CustomerSortOptions;
  branches: BranchSelectOption[];
  error: string | null;
}

function CustomersList({
  initialData,
  initialSearch,
  initialFilters,
  initialSort,
  branches,
  error: initialError,
}: CustomersListProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [search, setSearch] = React.useState(initialSearch);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingCustomer, setEditingCustomer] = React.useState<Customer | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(initialError);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);

  const data = initialData;

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      if (search === initialSearch) return;
      router.push(buildCustomersListUrl({search, page: 1, filters: initialFilters, sort: initialSort}));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search, initialSearch, initialFilters, initialSort, router]);

  function handlePageChange(page: number) {
    router.push(buildCustomersListUrl({search, page, filters: initialFilters, sort: initialSort}));
  }

  function openCreate() {
    setEditingCustomer(null);
    setModalOpen(true);
  }

  async function handleDelete(customer: Customer) {
    const confirmed = await confirm({
      title: 'Excluir cliente',
      description: `Excluir o cliente "${customer.displayName}"? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      variant: 'destructive',
    });
    if (!confirmed) return;

    setActionLoading(customer.id);
    const result = await deleteCustomerAction(customer.id);
    if (!result.success) {
      setActionError(result.error);
      toast.error(result.error);
    } else {
      toast.success('Cliente excluído com sucesso');
      router.refresh();
    }
    setActionLoading(null);
    setOpenMenuId(null);
  }

  async function handleStatusChange(customer: Customer, customerStatus: CustomerStatus) {
    setActionLoading(customer.id);
    const result = await updateCustomerStatusAction(customer.id, {customerStatus});
    if (!result.success) {
      setActionError(result.error);
      toast.error(result.error);
    } else {
      toast.success(
        customerStatus === 'active' ? 'Cliente ativado' : 'Cliente inativado',
      );
      router.refresh();
    }
    setActionLoading(null);
    setOpenMenuId(null);
  }

  const columns = [
    {
      id: 'name',
      header: 'Cliente',
      cell: (row: Customer) => (
        <Link href={ROUTES.clienteDetail(row.id)} className="font-medium hover:underline">
          <div>{row.displayName}</div>
          {row.tradeName && row.legalName !== row.tradeName && (
            <div className="text-xs text-muted-foreground">{row.legalName}</div>
          )}
        </Link>
      ),
    },
    {
      id: 'taxId',
      header: 'CNPJ',
      cell: (row: Customer) => formatCnpj(row.taxId),
    },
    {
      id: 'segment',
      header: 'Segmento',
      cell: (row: Customer) => (row.segment ? CUSTOMER_SEGMENT_LABELS[row.segment] : '—'),
    },
    {
      id: 'salesRep',
      header: 'Responsável',
      cell: (row: Customer) => row.salesRepresentative ?? '—',
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row: Customer) => (
        <Badge variant={getCustomerStatusVariant(row.customerStatus)}>
          {CUSTOMER_STATUS_LABELS[row.customerStatus]}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      className: 'w-12',
      cell: (row: Customer) => (
        <RowActionsMenu
          open={openMenuId === row.id}
          onOpenChange={(open) => setOpenMenuId(open ? row.id : null)}
          disabled={actionLoading === row.id}
        >
          <Link
            href={ROUTES.clienteDetail(row.id)}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
            onClick={() => setOpenMenuId(null)}
          >
            <Eye className="size-4" /> Ver detalhes
          </Link>
          <RowActionsMenuItem
            onClick={() => {
              setEditingCustomer(row);
              setModalOpen(true);
              setOpenMenuId(null);
            }}
          >
            <Pencil className="size-4" /> Editar
          </RowActionsMenuItem>
          {row.customerStatus !== 'active' && (
            <RowActionsMenuItem onClick={() => handleStatusChange(row, 'active')}>
              Ativar
            </RowActionsMenuItem>
          )}
          {row.customerStatus === 'active' && (
            <RowActionsMenuItem onClick={() => handleStatusChange(row, 'inactive')}>
              Inativar
            </RowActionsMenuItem>
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
      title="Clientes"
      description="Gestão de clientes e contratos comerciais"
      actions={
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" />
          Novo cliente
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
          placeholder="Buscar por nome, CNPJ, e-mail..."
          className="max-w-sm"
        />
        <CustomerFilters
          filters={initialFilters}
          sort={initialSort}
          search={search}
          branches={branches}
        />
      </div>

      <TableContainer>
        <DataTable
          columns={columns}
          data={data.items}
          getRowKey={(row) => row.id}
          emptyTitle="Nenhum cliente encontrado"
          emptyDescription="Cadastre seu primeiro cliente ou ajuste os filtros de busca."
          emptyAction={{label: 'Novo cliente', onClick: openCreate}}
        />
      </TableContainer>

      <ListPagination
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        totalPages={data.totalPages}
        itemLabel="cliente"
        onPageChange={handlePageChange}
      />

      <CustomerFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        customer={editingCustomer}
        branches={branches}
        onSaved={() => router.refresh()}
      />
    </PageTemplate>
  );
}

export {CustomersList};
