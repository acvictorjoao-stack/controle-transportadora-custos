'use client';

import * as React from 'react';

import {FormField} from '@/components/master/shared/form-field';
import {Modal} from '@/components/master/shared/modal';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {
  createPortalUserAction,
  type PortalUserCredentials,
} from '@/features/master/users/actions/portal-user-actions';
import {PORTAL_ROLE_LABELS, PORTAL_ROLES, type PortalRole} from '@/lib/auth/permissions';

import {PortalUserCredentialsSuccess} from './portal-user-credentials-success';

export interface PortalUserFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  mode: 'create' | 'edit';
  userId?: string;
  initialData?: {
    fullName: string;
    email: string;
    role: PortalRole;
  };
}

function PortalUserFormModal({
  open,
  onClose,
  onSaved,
  mode,
  userId,
  initialData,
}: PortalUserFormModalProps) {
  const [credentials, setCredentials] = React.useState<PortalUserCredentials | null>(
    null,
  );

  function handleClose() {
    setCredentials(null);
    onClose();
  }

  function handleFinish() {
    setCredentials(null);
    onSaved?.();
    onClose();
  }

  const formKey = open ? `${mode}-${userId ?? 'new'}` : 'closed';

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={
        credentials
          ? 'Credenciais do usuário'
          : mode === 'create'
            ? 'Novo usuário'
            : 'Editar usuário'
      }
      description={
        credentials
          ? 'Guarde as credenciais antes de fechar'
          : mode === 'create'
            ? 'Cadastre um operador do Portal Master'
            : 'Atualize os dados do operador'
      }
    >
      {credentials ? (
        <PortalUserCredentialsSuccess
          credentials={credentials}
          onFinish={handleFinish}
        />
      ) : (
        <PortalUserFormBody
          key={formKey}
          mode={mode}
          userId={userId}
          initialData={initialData}
          onClose={handleClose}
          onSaved={onSaved}
          onCredentials={setCredentials}
        />
      )}
    </Modal>
  );
}

interface PortalUserFormBodyProps {
  mode: 'create' | 'edit';
  userId?: string;
  initialData?: {
    fullName: string;
    email: string;
    role: PortalRole;
  };
  onClose: () => void;
  onSaved?: () => void;
  onCredentials: (credentials: PortalUserCredentials) => void;
}

function PortalUserFormBody({
  mode,
  userId,
  initialData,
  onClose,
  onSaved,
  onCredentials,
}: PortalUserFormBodyProps) {
  const [fullName, setFullName] = React.useState(initialData?.fullName ?? '');
  const [email, setEmail] = React.useState(initialData?.email ?? '');
  const [role, setRole] = React.useState<PortalRole>(
    initialData?.role ?? PORTAL_ROLES.SUPPORT,
  );
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    try {
      if (mode === 'create') {
        const result = await createPortalUserAction({fullName, email, role});
        if (!result.success) {
          setError(result.error);
          if (result.fieldErrors) setFieldErrors(result.fieldErrors);
          return;
        }
        onCredentials(result.data);
        return;
      }

      if (!userId) return;

      const {updatePortalUserAction} = await import(
        '@/features/master/users/actions/portal-user-actions'
      );
      const result = await updatePortalUserAction(userId, {fullName, email, role});
      if (!result.success) {
        setError(result.error);
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        return;
      }
      onSaved?.();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  const selectClassName =
    'flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30';

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <FormField
            label="Nome completo"
            htmlFor="fullName"
            required
            error={fieldErrors.fullName}
          >
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
              error={Boolean(fieldErrors.fullName)}
            />
          </FormField>

          <FormField label="E-mail" htmlFor="email" required error={fieldErrors.email}>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              error={Boolean(fieldErrors.email)}
            />
          </FormField>

          <FormField label="Papel" htmlFor="role" required error={fieldErrors.role}>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as PortalRole)}
              disabled={loading}
              className={selectClassName}
            >
              {Object.values(PORTAL_ROLES).map((r) => (
                <option key={r} value={r}>
                  {PORTAL_ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </FormField>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              {mode === 'create' ? 'Criar usuário' : 'Salvar alterações'}
            </Button>
          </div>
        </form>
  );
}

export {PortalUserFormModal};
