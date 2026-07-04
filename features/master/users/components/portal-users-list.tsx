'use client';

import {
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Mail,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  PowerOff,
} from 'lucide-react';
import {useRouter} from 'next/navigation';
import * as React from 'react';

import {DataTable} from '@/components/data-display/data-table';
import {TableContainer} from '@/components/data-display/table-container';
import {SearchInput} from '@/components/forms/search-input';
import {Modal} from '@/components/master/shared/modal';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {ROUTES} from '@/constants/routes/paths';
import {
  resetPortalUserPasswordAction,
  resendPortalUserInviteAction,
  togglePortalUserStatusAction,
  type PortalUserCredentials,
} from '@/features/master/users/actions/portal-user-actions';
import type {
  PaginatedPortalUsers,
  PortalUserRoleFilter,
  PortalUserStatusFilter,
} from '@/features/master/users/types';
import {PORTAL_ROLE_LABELS, PORTAL_ROLES, type PortalRole} from '@/lib/auth/permissions';

import {PortalUserCredentialsSuccess} from './portal-user-credentials-success';
import {PortalUserFormModal} from './portal-user-form-modal';

export interface PortalUsersListProps {
  initialData: PaginatedPortalUsers | null;
  initialSearch: string;
  initialPage: number;
  initialRole: PortalUserRoleFilter;
  initialStatus: PortalUserStatusFilter;
  error: string | null;
}

function formatDateTime(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR');
}

function buildListUrl(options: {
  search: string;
  page: number;
  role: PortalUserRoleFilter;
  status: PortalUserStatusFilter;
}): string {
  const params = new URLSearchParams();
  if (options.search.trim()) params.set('q', options.search.trim());
  if (options.page > 1) params.set('page', String(options.page));
  if (options.role !== 'all') params.set('role', options.role);
  if (options.status !== 'all') params.set('status', options.status);
  const query = params.toString();
  return query ? `${ROUTES.masterUsuarios}?${query}` : ROUTES.masterUsuarios;
}

function PortalUsersList({
  initialData,
  initialSearch,
  initialPage,
  initialRole,
  initialStatus,
  error,
}: PortalUsersListProps) {
  const router = useRouter();
  const [search, setSearch] = React.useState(initialSearch);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editUser, setEditUser] = React.useState<{
    id: string;
    fullName: string;
    email: string;
    role: PortalRole;
  } | null>(null);
  const [actionMenuUserId, setActionMenuUserId] = React.useState<string | null>(null);
  const [credentials, setCredentials] = React.useState<PortalUserCredentials | null>(null);
  const [credentialsTitle, setCredentialsTitle] = React.useState('');
  const [actionLoading, setActionLoading] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const items = initialData?.items ?? [];
  const total = initialData?.total ?? 0;
  const page = initialData?.page ?? initialPage;
  const totalPages = initialData?.totalPages ?? 1;

  const listOptions = React.useMemo(
    () => ({
      search: initialSearch,
      page,
      role: initialRole,
      status: initialStatus,
    }),
    [initialSearch, page, initialRole, initialStatus],
  );

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      if (search === initialSearch) return;
      router.push(buildListUrl({...listOptions, search, page: 1}));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search, initialSearch, router, listOptions]);

  function handleFilterChange(
    key: 'role' | 'status',
    value: string,
  ) {
    router.push(
      buildListUrl({
        ...listOptions,
        [key]: value || 'all',
        page: 1,
      }),
    );
  }

  async function handleToggleStatus(id: string, active: boolean) {
    setActionLoading(true);
    setActionError(null);
    setActionMenuUserId(null);
    try {
      const result = await togglePortalUserStatusAction(id, active);
      if (!result.success) {
        setActionError(result.error);
        return;
      }
      router.refresh();
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResetPassword(id: string) {
    setActionLoading(true);
    setActionError(null);
    setActionMenuUserId(null);
    try {
      const result = await resetPortalUserPasswordAction(id);
      if (!result.success) {
        setActionError(result.error);
        return;
      }
      setCredentialsTitle('Senha resetada com sucesso');
      setCredentials(result.data);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResendInvite(id: string) {
    setActionLoading(true);
    setActionError(null);
    setActionMenuUserId(null);
    try {
      const result = await resendPortalUserInviteAction(id);
      if (!result.success) {
        setActionError(result.error);
        return;
      }
      setCredentialsTitle('Convite reenviado — novas credenciais');
      setCredentials(result.data);
    } finally {
      setActionLoading(false);
    }
  }

  const selectClassName =
    'flex h-9 rounded-lg border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30';

  const columns = [
    {
      id: 'name',
      header: 'Nome',
      cell: (row: (typeof items)[number]) => (
        <span className="font-medium">{row.fullName}</span>
      ),
    },
    {
      id: 'email',
      header: 'E-mail',
      cell: (row: (typeof items)[number]) => row.email,
    },
    {
      id: 'role',
      header: 'Papel',
      cell: (row: (typeof items)[number]) => (
        <Badge variant="secondary">{PORTAL_ROLE_LABELS[row.role]}</Badge>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row: (typeof items)[number]) => (
        <Badge variant={row.status === 'active' ? 'success' : 'warning'}>
          {row.status === 'active' ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    {
      id: 'lastLogin',
      header: 'Último login',
      cell: (row: (typeof items)[number]) => formatDateTime(row.lastLoginAt),
    },
    {
      id: 'createdAt',
      header: 'Criação',
      cell: (row: (typeof items)[number]) =>
        new Date(row.createdAt).toLocaleDateString('pt-BR'),
    },
    {
      id: 'actions',
      header: '',
      headerClassName: 'w-12',
      cell: (row: (typeof items)[number]) => (
        <div className="relative flex justify-end">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Ações"
            onClick={() =>
              setActionMenuUserId((prev) => (prev === row.id ? null : row.id))
            }
          >
            <MoreHorizontal className="size-4" />
          </Button>
          {actionMenuUserId === row.id && (
            <div className="absolute right-0 top-full z-20 mt-1 min-w-44 rounded-lg border border-border bg-card py-1 shadow-lg">
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  setEditUser({
                    id: row.id,
                    fullName: row.fullName,
                    email: row.email,
                    role: row.role,
                  });
                  setActionMenuUserId(null);
                }}
              >
                <Pencil className="size-3.5" />
                Editar
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => void handleResetPassword(row.id)}
              >
                <KeyRound className="size-3.5" />
                Reset de senha
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => void handleResendInvite(row.id)}
              >
                <Mail className="size-3.5" />
                Reenviar convite
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() =>
                  void handleToggleStatus(row.id, row.status !== 'active')
                }
              >
                {row.status === 'active' ? (
                  <>
                    <PowerOff className="size-3.5" />
                    Inativar
                  </>
                ) : (
                  <>
                    <Power className="size-3.5" />
                    Ativar
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <TableContainer
        title="Usuários da plataforma"
        description={`${total} usuário(s) encontrado(s)`}
        toolbar={
          <>
            <SearchInput
              value={search}
              onValueChange={setSearch}
              placeholder="Buscar por nome ou e-mail..."
              className="w-full sm:w-64"
            />
            <select
              aria-label="Filtrar por papel"
              value={initialRole === 'all' ? '' : initialRole}
              onChange={(e) => handleFilterChange('role', e.target.value)}
              className={selectClassName}
            >
              <option value="">Todos os papéis</option>
              {Object.values(PORTAL_ROLES).map((r) => (
                <option key={r} value={r}>
                  {PORTAL_ROLE_LABELS[r]}
                </option>
              ))}
            </select>
            <select
              aria-label="Filtrar por status"
              value={initialStatus === 'all' ? '' : initialStatus}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className={selectClassName}
            >
              <option value="">Todos os status</option>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Novo usuário
            </Button>
          </>
        }
      >
        {(error || actionError) && (
          <div className="px-6 pt-4">
            <Alert variant="destructive">
              <AlertDescription>{error ?? actionError}</AlertDescription>
            </Alert>
          </div>
        )}

        <DataTable
          columns={columns}
          data={items}
          getRowKey={(row) => row.id}
          loading={actionLoading}
          emptyTitle="Nenhum usuário encontrado"
          emptyDescription="Cadastre o primeiro operador do Portal Master."
        />

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-6 py-4">
            <p className="text-sm text-muted-foreground">
              Página {page} de {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() =>
                  router.push(buildListUrl({...listOptions, page: page - 1}))
                }
              >
                <ChevronLeft className="size-4" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() =>
                  router.push(buildListUrl({...listOptions, page: page + 1}))
                }
              >
                Próxima
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </TableContainer>

      <PortalUserFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={() => router.refresh()}
        mode="create"
      />

      <PortalUserFormModal
        open={Boolean(editUser)}
        onClose={() => setEditUser(null)}
        onSaved={() => router.refresh()}
        mode="edit"
        userId={editUser?.id}
        initialData={editUser ?? undefined}
      />

      <Modal
        open={Boolean(credentials)}
        onClose={() => setCredentials(null)}
        title="Credenciais"
        description="Guarde as credenciais antes de fechar"
      >
        {credentials && (
          <PortalUserCredentialsSuccess
            credentials={credentials}
            title={credentialsTitle}
            onFinish={() => setCredentials(null)}
          />
        )}
      </Modal>
    </>
  );
}

export {PortalUsersList};
