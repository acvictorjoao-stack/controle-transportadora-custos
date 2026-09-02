'use client';

import * as React from 'react';

import {FormField} from '@/components/master/shared/form-field';
import {Modal} from '@/components/master/shared/modal';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {
  provisionCompanyAdministratorAction,
  type AdminCredentialsResult,
} from '@/features/master/companies/actions';
import type {CompanyAdmin} from '@/features/master/companies/types';

import {ProvisionAdminCredentialsSuccess} from './provision-admin-credentials-success';

export interface ProvisionAdminModalProps {
  open: boolean;
  companyId: string;
  onClose: () => void;
  onProvisioned?: (result: AdminCredentialsResult & {admin: CompanyAdmin}) => void;
}

function ProvisionAdminModal({
  open,
  companyId,
  onClose,
  onProvisioned,
}: ProvisionAdminModalProps) {
  const [credentials, setCredentials] = React.useState<
    (AdminCredentialsResult & {admin: CompanyAdmin}) | null
  >(null);

  function handleClose() {
    setCredentials(null);
    onClose();
  }

  function handleFinish() {
    if (credentials && onProvisioned) {
      onProvisioned(credentials);
    }
    handleClose();
  }

  const formKey = open ? `provision-${companyId}` : 'closed';

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={credentials ? 'Administrador provisionado' : 'Provisionar administrador'}
      description={
        credentials
          ? 'Guarde as credenciais antes de fechar'
          : 'Crie o administrador principal com perfil Administrador'
      }
    >
      {credentials ? (
        <ProvisionAdminCredentialsSuccess
          credentials={credentials}
          onFinish={handleFinish}
        />
      ) : (
        <ProvisionAdminForm
          key={formKey}
          companyId={companyId}
          onClose={handleClose}
          onProvisioned={setCredentials}
        />
      )}
    </Modal>
  );
}

interface ProvisionAdminFormProps {
  companyId: string;
  onClose: () => void;
  onProvisioned: (result: AdminCredentialsResult & {admin: CompanyAdmin}) => void;
}

function ProvisionAdminForm({
  companyId,
  onClose,
  onProvisioned,
}: ProvisionAdminFormProps) {
  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [fieldErrors, setFieldErrors] = React.useState<{
    fullName?: string;
    email?: string;
  }>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    const result = await provisionCompanyAdministratorAction(companyId, {
      fullName,
      email,
    });

    if (!result.success) {
      setFormError(result.error);
      if (result.fieldErrors) {
        setFieldErrors({
          fullName: result.fieldErrors.fullName,
          email: result.fieldErrors.email,
        });
      }
      setSubmitting(false);
      return;
    }

    onProvisioned(result.data);
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {formError && (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <FormField
            label="Nome completo"
            htmlFor="provision-admin-full-name"
            required
            error={fieldErrors.fullName}
          >
            <Input
              id="provision-admin-full-name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              error={Boolean(fieldErrors.fullName)}
              autoComplete="name"
            />
          </FormField>

          <FormField
            label="E-mail"
            htmlFor="provision-admin-email"
            required
            error={fieldErrors.email}
          >
            <Input
              id="provision-admin-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              error={Boolean(fieldErrors.email)}
              autoComplete="email"
            />
          </FormField>

          <p className="text-sm text-muted-foreground">
            Perfil atribuído: <span className="font-medium">Administrador</span>
          </p>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Provisionando...' : 'Provisionar administrador'}
            </Button>
          </div>
        </form>
  );
}

export {ProvisionAdminModal};
