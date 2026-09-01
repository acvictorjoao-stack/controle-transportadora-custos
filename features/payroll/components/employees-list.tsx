'use client';

import {Pencil, Plus} from 'lucide-react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import * as React from 'react';

import {useSyncedListData} from '@/hooks/use-synced-list-data';

import {RowActionsMenu, RowActionsMenuItem} from '@/components/common/row-actions-menu';
import {DataTable} from '@/components/data-display/data-table';
import {ListPagination} from '@/components/data-display/list-pagination';
import {TableContainer} from '@/components/data-display/table-container';
import {SearchInput} from '@/components/forms/search-input';
import {PageTemplate} from '@/components/layout/page-template';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {ROUTES} from '@/constants/routes/paths';
import {useToast} from '@/contexts/feedback/toast-context';
import type {CostCenterSelectOption} from '@/features/cost-centers/types';
import {formatCpf} from '@/features/drivers/utils/driver-status';
import {formatDateBr} from '@/features/financial/utils/financial-format';
import type {BranchSelectOption} from '@/features/organization/branches/types';
import {useNavPermissions} from '@/hooks/use-nav-permissions';
import {hasPermission} from '@/lib/navigation/has-permission';
import {MSG} from '@/lib/feedback/messages';

import {toggleEmployeeStatusAction} from '../actions';
import type {EmployeeListItem, PaginatedEmployees, Position} from '../types';
import {EMPLOYEE_CONTRACT_TYPE_LABELS, PERSONNEL_STATUS_LABELS} from '../types';
import {EmployeeFormModal} from './employee-form-modal';

export interface EmployeesListProps {
  initialData: PaginatedEmployees;
  positions: Position[];
  costCenters: CostCenterSelectOption[];
  branches: BranchSelectOption[];
  initialSearch: string;
  error: string | null;
}

function buildListUrl(search: string, page: number): string {
  const params = new URLSearchParams();
  if (search.trim()) params.set('q', search.trim());
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `${ROUTES.administracaoFuncionarios}?${query}` : ROUTES.administracaoFuncionarios;
}

function statusVariant(status: EmployeeListItem['status']) {
  return status === 'active' ? ('success' as const) : ('warning' as const);
}

function EmployeesList({
  initialData,
  positions,
  costCenters,
  branches,
  initialSearch,
  error: initialError,
}: EmployeesListProps) {
  const router = useRouter();
  const toast = useToast();
  const permissions = useNavPermissions();
  const canCreate = hasPermission('financeiro:create', permissions);
  const canUpdate = hasPermission('financeiro:update', permissions);

  const [search, setSearch] = React.useState(initialSearch);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<EmployeeListItem | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(initialError);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);

  const {data, patchItem, upsertItem} = useSyncedListData(initialData);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      if (search === initialSearch) return;
      router.push(buildListUrl(search, 1));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search, initialSearch, router]);

  function handlePageChange(page: number) {
    router.push(buildListUrl(search, page));
  }

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(employee: EmployeeListItem) {
    setEditing(employee);
    setModalOpen(true);
  }

  async function handleToggleStatus(employee: EmployeeListItem) {
    setActionLoading(employee.id);
    setActionError(null);

    const result = await toggleEmployeeStatusAction(employee.id, employee.status !== 'active');
    if (!result.success) {
      toast.error(result.error ?? MSG.operationFailed);
    } else {
      toast.success(
        employee.status === 'active'
          ? MSG.deactivated('Funcionário')
          : MSG.activated('Funcionário'),
      );
      if (result.data) upsertItem({...employee, ...result.data});
      else {
        patchItem(employee.id, {
          status: employee.status === 'active' ? 'inactive' : 'active',
          active: employee.status !== 'active',
        });
      }
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
      cell: (row: EmployeeListItem) => <span className="font-medium">{row.name}</span>,
    },
    {
      id: 'cpf',
      header: 'CPF',
      cell: (row: EmployeeListItem) => (
        <span className="font-mono text-xs">{row.cpf ? formatCpf(row.cpf) : '—'}</span>
      ),
    },
    {
      id: 'position',
      header: 'Cargo',
      cell: (row: EmployeeListItem) => row.positionName ?? '—',
    },
    {
      id: 'costCenter',
      header: 'Centro de custo',
      cell: (row: EmployeeListItem) => row.costCenterName ?? '—',
    },
    {
      id: 'branch',
      header: 'Filial',
      cell: (row: EmployeeListItem) => row.branchName ?? '—',
    },
    {
      id: 'contractType',
      header: 'Tipo de contrato',
      cell: (row: EmployeeListItem) =>
        row.contractType
          ? EMPLOYEE_CONTRACT_TYPE_LABELS[
              row.contractType as keyof typeof EMPLOYEE_CONTRACT_TYPE_LABELS
            ] ?? row.contractType
          : '—',
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row: EmployeeListItem) => (
        <Badge variant={statusVariant(row.status)}>
          {PERSONNEL_STATUS_LABELS[row.status === 'active' ? 'active' : 'inactive']}
        </Badge>
      ),
    },
    {
      id: 'hiredAt',
      header: 'Admissão',
      cell: (row: EmployeeListItem) => formatDateBr(row.hiredAt),
    },
    {
      id: 'actions',
      header: '',
      className: 'w-12',
      cell: (row: EmployeeListItem) =>
        canUpdate ? (
          <RowActionsMenu
            open={openMenuId === row.id}
            onOpenChange={(open) => setOpenMenuId(open ? row.id : null)}
            disabled={actionLoading === row.id}
          >
            <RowActionsMenuItem
              onClick={() => {
                openEdit(row);
                setOpenMenuId(null);
              }}
            >
              <Pencil className="size-4" /> Editar
            </RowActionsMenuItem>
            <RowActionsMenuItem onClick={() => handleToggleStatus(row)}>
              {row.status === 'active' ? 'Desativar' : 'Ativar'}
            </RowActionsMenuItem>
          </RowActionsMenu>
        ) : null,
    },
  ];

  return (
    <PageTemplate
      title="Funcionários"
      description="Cadastro de colaboradores da empresa para folha de pagamento."
      actions={
        canCreate ? (
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4" />
            Novo funcionário
          </Button>
        ) : undefined
      }
      actionBar={{
        leading: (
          <SearchInput
            value={search}
            onValueChange={setSearch}
            placeholder="Buscar por nome, CPF ou matrícula…"
            className="w-full max-w-sm"
          />
        ),
      }}
    >
      <Alert className="mb-4">
        <AlertDescription>
          Motoristas são gerenciados no{' '}
          <Link href={ROUTES.motoristas} className="font-medium text-primary underline-offset-4 hover:underline">
            cadastro de Motoristas
          </Link>
          . Esta tela é apenas para demais colaboradores.
        </AlertDescription>
      </Alert>

      {actionError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}

      <TableContainer>
        <DataTable
          columns={columns}
          data={data.items}
          getRowKey={(row) => row.id}
          emptyTitle="Nenhum funcionário cadastrado"
          emptyDescription="Cadastre colaboradores para utilizá-los em Despesas de Pessoal."
          emptyAction={canCreate ? {label: 'Novo funcionário', onClick: openCreate} : undefined}
        />
      </TableContainer>

      <ListPagination
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        totalPages={data.totalPages}
        itemLabel="funcionário"
        onPageChange={handlePageChange}
      />

      <EmployeeFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        employee={editing}
        positions={positions}
        costCenters={costCenters}
        branches={branches}
        onSaved={handleSaved}
      />
    </PageTemplate>
  );
}

export {EmployeesList};
