'use client';

import {Eye, Pencil, Plus, Power, Trash2} from 'lucide-react';
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
import {MSG} from '@/lib/feedback/messages';

import {
  deleteSupplierAction,
  updateSupplierActiveAction,
} from '../actions';
import type {PaginatedSuppliers, Supplier, SupplierListFilters, SupplierSortOptions} from '../types';
import {buildSuppliersListUrl} from '../utils/list-url';
import {formatPhone} from '../utils/supplier-format';
import {SupplierCategoriesBadges} from './supplier-badge';
import {SupplierFilters} from './supplier-filters';
import {SupplierFormModal} from './supplier-form-modal';

export interface SuppliersListProps {
  initialData: PaginatedSuppliers;
  initialSearch: string;
  initialFilters: SupplierListFilters;
  initialSort: SupplierSortOptions;
  error: string | null;
}

function SuppliersList({
  initialData,
  initialSearch,
  initialFilters,
  initialSort,
  error: initialError,
}: SuppliersListProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [search, setSearch] = React.useState(initialSearch);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Supplier | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(initialError);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);

  const data = initialData;

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      if (search === initialSearch) return;
      router.push(
        buildSuppliersListUrl({
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
      buildSuppliersListUrl({
        search,
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

  function openEdit(supplier: Supplier) {
    setEditing(supplier);
    setModalOpen(true);
    setOpenMenuId(null);
  }

  async function handleDelete(supplier: Supplier) {
    const confirmed = await confirm({
      title: MSG.deleteConfirmTitle,
      description:
        'Fornecedores com vínculos não podem ser excluídos — apenas inativados. Deseja tentar excluir?',
      confirmLabel: MSG.deleteConfirmLabel,
      variant: 'destructive',
    });
    if (!confirmed) return;

    setActionLoading(supplier.id);
    setActionError(null);
    const result = await deleteSupplierAction(supplier.id);
    if (!result.success) {
      toast.error(result.error ?? MSG.operationFailed);
      setActionError(result.error ?? null);
    } else {
      toast.success(MSG.deleted('Fornecedor'));
      router.refresh();
    }
    setActionLoading(null);
    setOpenMenuId(null);
  }

  async function handleToggleActive(supplier: Supplier) {
    setActionLoading(supplier.id);
    setActionError(null);
    const result = await updateSupplierActiveAction(supplier.id, {
      active: !supplier.active,
    });
    if (!result.success) {
      toast.error(result.error ?? MSG.operationFailed);
    } else {
      toast.success(
        supplier.active
          ? MSG.deactivated('Fornecedor')
          : MSG.activated('Fornecedor'),
      );
      router.refresh();
    }
    setActionLoading(null);
    setOpenMenuId(null);
  }

  const columns = [
    {
      id: 'supplier',
      header: 'Fornecedor',
      cell: (row: Supplier) => (
        <div className="min-w-0">
          <Link
            href={ROUTES.fornecedorDetail(row.id)}
            className="font-medium text-foreground hover:underline"
          >
            {row.displayName}
          </Link>
          {row.tradeName && row.tradeName !== row.corporateName && (
            <p className="truncate text-xs text-muted-foreground">{row.corporateName}</p>
          )}
        </div>
      ),
    },
    {
      id: 'category',
      header: 'Categoria',
      cell: (row: Supplier) => <SupplierCategoriesBadges categories={row.categories} />,
    },
    {
      id: 'city',
      header: 'Cidade',
      cell: (row: Supplier) =>
        [row.city, row.state].filter(Boolean).join('/') || '—',
    },
    {
      id: 'contact',
      header: 'Contato',
      cell: (row: Supplier) => (
        <div className="text-sm">
          <div>{row.contactName ?? '—'}</div>
          <div className="text-xs text-muted-foreground">{formatPhone(row.phone)}</div>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row: Supplier) => (
        <Badge variant={row.active ? 'success' : 'warning'}>
          {row.active ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: (row: Supplier) => (
        <RowActionsMenu
          open={openMenuId === row.id}
          onOpenChange={(open) => setOpenMenuId(open ? row.id : null)}
          disabled={actionLoading === row.id}
        >
          <Link
            href={ROUTES.fornecedorDetail(row.id)}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
            onClick={() => setOpenMenuId(null)}
          >
            <Eye className="size-4" /> Ver ficha
          </Link>
          <RowActionsMenuItem onClick={() => openEdit(row)}>
            <Pencil className="size-4" /> Editar
          </RowActionsMenuItem>
          <RowActionsMenuItem onClick={() => handleToggleActive(row)}>
            <Power className="size-4" />
            {row.active ? 'Inativar' : 'Ativar'}
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
      title="Fornecedores"
      description="Empresas e pessoas físicas que prestam serviços ou fornecem produtos"
      actions={
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" />
          Novo fornecedor
        </Button>
      }
      actionBar={{
        leading: (
          <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <SearchInput
              value={search}
              onValueChange={setSearch}
              placeholder="Buscar por nome, fantasia, CNPJ, CPF…"
              className="w-full max-w-sm"
            />
            <SupplierFilters search={search} filters={initialFilters} />
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
          emptyTitle="Nenhum fornecedor cadastrado"
          emptyDescription="Cadastre fornecedores para usar em manutenções, abastecimentos, pneus e contas a pagar."
          emptyAction={{label: 'Novo fornecedor', onClick: openCreate}}
        />
      </TableContainer>

      <ListPagination
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        totalPages={data.totalPages}
        itemLabel="fornecedor"
        onPageChange={handlePageChange}
      />

      <SupplierFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        supplier={editing}
        onSaved={() => router.refresh()}
      />
    </PageTemplate>
  );
}

export {SuppliersList};
