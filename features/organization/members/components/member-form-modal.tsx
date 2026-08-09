'use client';

import * as React from 'react';

import {FormField} from '@/components/master/shared/form-field';
import {Modal} from '@/components/master/shared/modal';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {
  createCompanyMemberAction,
  listCompanyRolesAction,
  updateCompanyMemberAction,
  type MemberCredentials,
} from '@/features/organization/members/actions';
import type {CompanyMemberListItem, CompanyRoleOption, MemberStatus} from '../types';
import {MEMBER_STATUS_LABELS} from '../constants';

import {MemberCredentialsSuccess} from './member-credentials-success';

export interface MemberFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  mode: 'create' | 'edit';
  member?: CompanyMemberListItem | null;
}

function MemberFormModal({
  open,
  onClose,
  onSaved,
  mode,
  member,
}: MemberFormModalProps) {
  const [credentials, setCredentials] = React.useState<MemberCredentials | null>(null);

  function handleClose() {
    setCredentials(null);
    onClose();
  }

  function handleFinish() {
    setCredentials(null);
    onSaved?.();
    onClose();
  }

  const formKey = open ? `${mode}-${member?.id ?? 'new'}` : 'closed';

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
            ? 'Crie um usuário individual para esta empresa'
            : 'Atualize os dados do usuário'
      }
    >
      {credentials ? (
        <MemberCredentialsSuccess
          credentials={credentials}
          onFinish={handleFinish}
        />
      ) : (
        <MemberFormBody
          key={formKey}
          mode={mode}
          member={member}
          onClose={handleClose}
          onSaved={onSaved}
          onCredentials={setCredentials}
        />
      )}
    </Modal>
  );
}

interface MemberFormBodyProps {
  mode: 'create' | 'edit';
  member?: CompanyMemberListItem | null;
  onClose: () => void;
  onSaved?: () => void;
  onCredentials: (credentials: MemberCredentials) => void;
}

function MemberFormBody({
  mode,
  member,
  onClose,
  onSaved,
  onCredentials,
}: MemberFormBodyProps) {
  const [fullName, setFullName] = React.useState(member?.fullName ?? '');
  const [email, setEmail] = React.useState(member?.email ?? '');
  const [phone, setPhone] = React.useState(member?.phone ?? '');
  const [roleId, setRoleId] = React.useState(member?.roleId ?? '');
  const [status, setStatus] = React.useState<MemberStatus>(member?.status ?? 'active');
  const [roles, setRoles] = React.useState<CompanyRoleOption[]>([]);
  const [rolesLoading, setRolesLoading] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    let cancelled = false;

    async function loadRoles() {
      setRolesLoading(true);
      const result = await listCompanyRolesAction();
      if (cancelled) return;

      if (!result.success) {
        setError(result.error);
        setRoles([]);
        setRolesLoading(false);
        return;
      }

      setRoles(result.data);
      if (!roleId && result.data.length > 0) {
        const preferred =
          result.data.find((role) => role.name === 'Operator') ?? result.data[0];
        setRoleId(preferred.id);
      }
      setRolesLoading(false);
    }

    void loadRoles();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per modal open
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    const payload = {
      fullName,
      email,
      phone,
      roleId,
      status,
    };

    try {
      if (mode === 'create') {
        const result = await createCompanyMemberAction(payload);
        if (!result.success) {
          setError(result.error);
          if (result.fieldErrors) setFieldErrors(result.fieldErrors);
          return;
        }
        onCredentials(result.data);
        return;
      }

      if (!member) return;

      const result = await updateCompanyMemberAction(member.id, payload);
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
        htmlFor="member-fullName"
        required
        error={fieldErrors.fullName}
      >
        <Input
          id="member-fullName"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          disabled={loading}
          error={Boolean(fieldErrors.fullName)}
        />
      </FormField>

      <FormField
        label="E-mail"
        htmlFor="member-email"
        required
        error={fieldErrors.email}
      >
        <Input
          id="member-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          error={Boolean(fieldErrors.email)}
        />
      </FormField>

      <FormField label="Telefone" htmlFor="member-phone" error={fieldErrors.phone}>
        <Input
          id="member-phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={loading}
          error={Boolean(fieldErrors.phone)}
        />
      </FormField>

      <FormField label="Perfil (role)" htmlFor="member-role" required error={fieldErrors.roleId}>
        <select
          id="member-role"
          value={roleId}
          onChange={(e) => setRoleId(e.target.value)}
          disabled={loading || rolesLoading}
          className={selectClassName}
        >
          <option value="" disabled>
            {rolesLoading ? 'Carregando...' : 'Selecione um perfil'}
          </option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Status" htmlFor="member-status" required error={fieldErrors.status}>
        <select
          id="member-status"
          value={status}
          onChange={(e) => setStatus(e.target.value as MemberStatus)}
          disabled={loading}
          className={selectClassName}
        >
          <option value="active">{MEMBER_STATUS_LABELS.active}</option>
          <option value="inactive">{MEMBER_STATUS_LABELS.inactive}</option>
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

export {MemberFormModal};
