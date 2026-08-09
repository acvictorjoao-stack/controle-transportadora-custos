'use client';

import {KeyRound, Pencil, Plus, Power, PowerOff} from 'lucide-react';
import {useRouter} from 'next/navigation';
import * as React from 'react';

import {RowActionsMenu, RowActionsMenuItem} from '@/components/common/row-actions-menu';
import {DataTable} from '@/components/data-display/data-table';
import {ListPagination} from '@/components/data-display/list-pagination';
import {TableContainer} from '@/components/data-display/table-container';
import {SearchInput} from '@/components/forms/search-input';
import {PageTemplate} from '@/components/layout/page-template';
import {Modal} from '@/components/master/shared/modal';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {useConfirm} from '@/contexts/feedback/confirm-context';
import {useToast} from '@/contexts/feedback/toast-context';
import {ROUTES} from '@/constants/routes/paths';
import {
  resetCompanyMemberPasswordAction,
  toggleCompanyMemberStatusAction,
  type MemberCredentials,
} from '@/features/organization/members/actions';
import {useSyncedListData} from '@/hooks/use-synced-list-data';

import {MEMBER_STATUS_LABELS} from '../constants';
import type {
  CompanyMemberListItem,
  MemberStatusFilter,
  PaginatedCompanyMembers,
} from '../types';
import {MemberCredentialsSuccess} from './member-credentials-success';
import {MemberFormModal} from './member-form-modal';

export interface MembersListProps {
  initialData: PaginatedCompanyMembers;
  initialSearch: string;
  initialStatus: MemberStatusFilter;
  currentProfileId: string | null;
  /** members:invite ou members:write — criar/editar/status/reset */
  canManage: boolean;
  error: string | null;
}

function formatDateTime(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR');
}

function buildListUrl(options: {
  search: string;
  page: number;
  status: MemberStatusFilter;
}): string {
  const params = new URLSearchParams();
  if (options.search.trim()) params.set('q', options.search.trim());
  if (options.page > 1) params.set('page', String(options.page));
  if (options.status !== 'all') params.set('status', options.status);
  const query = params.toString();
  return query ? `${ROUTES.usuarios}?${query}` : ROUTES.usuarios;
}

function MembersList({
  initialData,
  initialSearch,
  initialStatus,
  currentProfileId,
  canManage,
  error: initialError,
}: MembersListProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [search, setSearch] = React.useState(initialSearch);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingMember, setEditingMember] = React.useState<CompanyMemberListItem | null>(
    null,
  );
  const [actionError, setActionError] = React.useState<string | null>(initialError);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);
  const [credentials, setCredentials] = React.useState<MemberCredentials | null>(null);
  const [credentialsTitle, setCredentialsTitle] = React.useState('');

  const {data, patchItem} = useSyncedListData(initialData);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      if (search === initialSearch) return;
      router.push(buildListUrl({search, page: 1, status: initialStatus}));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search, initialSearch, initialStatus, router]);

  function handlePageChange(page: number) {
    router.push(buildListUrl({search, page, status: initialStatus}));
  }

  function handleStatusFilter(value: string) {
    router.push(
      buildListUrl({
        search,
        page: 1,
        status: (value || 'all') as MemberStatusFilter,
      }),
    );
  }

  function openCreate() {
    setEditingMember(null);
    setModalOpen(true);
  }

  function openEdit(member: CompanyMemberListItem) {
    setEditingMember(member);
    setModalOpen(true);
  }

  async function handleToggleStatus(member: CompanyMemberListItem) {
    if (!canManage) return;

    const nextStatus = member.status === 'active' ? 'inactive' : 'active';
    if (member.profileId === currentProfileId && nextStatus === 'inactive') {
      toast.error('Você não pode desativar o próprio usuário.');
      return;
    }

    const confirmed = await confirm({
      title: nextStatus === 'inactive' ? 'Desativar usuário' : 'Ativar usuário',
      description:
        nextStatus === 'inactive'
          ? `Desativar ${member.fullName}? O usuário não conseguirá acessar o sistema.`
          : `Ativar ${member.fullName}?`,
      confirmLabel: nextStatus === 'inactive' ? 'Desativar' : 'Ativar',
      variant: nextStatus === 'inactive' ? 'destructive' : 'default',
    });
    if (!confirmed) return;

    setActionLoading(member.id);
    setActionError(null);
    setOpenMenuId(null);

    const result = await toggleCompanyMemberStatusAction(member.id, nextStatus);
    if (!result.success) {
      toast.error(result.error);
      setActionError(result.error);
    } else {
      toast.success(
        nextStatus === 'inactive' ? 'Usuário desativado.' : 'Usuário ativado.',
      );
      patchItem(member.id, result.data);
    }
    setActionLoading(null);
  }

  async function handleResetPassword(member: CompanyMemberListItem) {
    if (!canManage) return;

    if (member.profileId === currentProfileId) {
      toast.error('Use a recuperação de senha do login para a sua própria senha.');
      return;
    }

    const confirmed = await confirm({
      title: 'Redefinir senha',
      description: `Gerar uma nova senha temporária para ${member.fullName}?`,
      confirmLabel: 'Redefinir',
    });
    if (!confirmed) return;

    setActionLoading(member.id);
    setActionError(null);
    setOpenMenuId(null);

    const result = await resetCompanyMemberPasswordAction(member.id);
    if (!result.success) {
      toast.error(result.error);
      setActionError(result.error);
    } else {
      setCredentialsTitle('Senha redefinida com sucesso');
      setCredentials(result.data);
    }
    setActionLoading(null);
  }

  const selectClassName =
    'flex h-9 rounded-lg border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30';

  const columns = [
    {
      id: 'name',
      header: 'Nome',
      cell: (row: CompanyMemberListItem) => (
        <span className="font-medium">{row.fullName}</span>
      ),
    },
    {
      id: 'email',
      header: 'E-mail',
      cell: (row: CompanyMemberListItem) => row.email,
    },
    {
      id: 'role',
      header: 'Role',
      cell: (row: CompanyMemberListItem) => (
        <Badge variant="secondary">{row.roleName}</Badge>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row: CompanyMemberListItem) => (
        <Badge variant={row.status === 'active' ? 'success' : 'warning'}>
          {MEMBER_STATUS_LABELS[row.status]}
        </Badge>
      ),
    },
    {
      id: 'lastLogin',
      header: 'Último acesso',
      cell: (row: CompanyMemberListItem) => formatDateTime(row.lastLoginAt),
    },
    {
      id: 'actions',
      header: '',
      className: 'w-12',
      cell: (row: CompanyMemberListItem) => {
        if (!canManage) return null;

        const isSelf = row.profileId === currentProfileId;

        return (
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

            {row.status === 'active' && !isSelf && (
              <RowActionsMenuItem
                destructive
                onClick={() => {
                  setOpenMenuId(null);
                  void handleToggleStatus(row);
                }}
              >
                <PowerOff className="size-4" /> Desativar
              </RowActionsMenuItem>
            )}

            {row.status === 'inactive' && (
              <RowActionsMenuItem
                onClick={() => {
                  setOpenMenuId(null);
                  void handleToggleStatus(row);
                }}
              >
                <Power className="size-4" /> Ativar
              </RowActionsMenuItem>
            )}

            {row.status === 'active' && !isSelf && (
              <RowActionsMenuItem
                onClick={() => {
                  setOpenMenuId(null);
                  void handleResetPassword(row);
                }}
              >
                <KeyRound className="size-4" /> Redefinir senha
              </RowActionsMenuItem>
            )}
          </RowActionsMenu>
        );
      },
    },
  ];

  return (
    <>
      <PageTemplate
        title="Usuários"
        description="Funcionários e acessos da sua empresa"
        actions={
          canManage ? (
            <Button size="sm" onClick={openCreate}>
              <Plus className="size-4" />
              Novo usuário
            </Button>
          ) : undefined
        }
      >
        <TableContainer
          title="Usuários da empresa"
          description={`${data.total} usuário(s) encontrado(s)`}
          toolbar={
            <>
              <SearchInput
                value={search}
                onValueChange={setSearch}
                placeholder="Buscar por nome ou e-mail..."
                className="w-full sm:w-64"
              />
              <select
                aria-label="Filtrar por status"
                value={initialStatus === 'all' ? '' : initialStatus}
                onChange={(e) => handleStatusFilter(e.target.value)}
                className={selectClassName}
              >
                <option value="">Todos os status</option>
                <option value="active">{MEMBER_STATUS_LABELS.active}</option>
                <option value="inactive">{MEMBER_STATUS_LABELS.inactive}</option>
              </select>
            </>
          }
        >
          {(actionError || initialError) && (
            <div className="px-6 pt-4">
              <Alert variant="destructive">
                <AlertDescription>{actionError ?? initialError}</AlertDescription>
              </Alert>
            </div>
          )}

          <DataTable
            columns={columns}
            data={data.items}
            getRowKey={(row) => row.id}
            loading={Boolean(actionLoading)}
            emptyTitle="Nenhum usuário encontrado"
            emptyDescription="Cadastre o primeiro usuário individual desta empresa."
          />

          <ListPagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            totalPages={data.totalPages}
            itemLabel="usuário"
            onPageChange={handlePageChange}
          />
        </TableContainer>
      </PageTemplate>

      <MemberFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingMember(null);
        }}
        onSaved={() => router.refresh()}
        mode={editingMember ? 'edit' : 'create'}
        member={editingMember}
      />

      <Modal
        open={Boolean(credentials)}
        onClose={() => setCredentials(null)}
        title="Credenciais"
        description="Guarde as credenciais antes de fechar"
      >
        {credentials && (
          <MemberCredentialsSuccess
            credentials={credentials}
            title={credentialsTitle}
            onFinish={() => setCredentials(null)}
          />
        )}
      </Modal>
    </>
  );
}

export {MembersList};
