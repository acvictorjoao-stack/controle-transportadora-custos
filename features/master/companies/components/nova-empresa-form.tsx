'use client';

import * as React from 'react';

import {FormField} from '@/components/master/shared/form-field';
import {AccessLinkPreview} from '@/components/master/empresas/access-link-preview';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {provisionCompanyAction} from '@/features/master/provisioning/actions';
import type {ProvisionCompanyResult} from '@/features/master/provisioning/types';
import type {ProvisionCompanyFormInput} from '@/features/master/provisioning/validation';
import {cn} from '@/lib/utils';

import {formatTaxId, slugify} from '../utils/format';

import type {PlanCatalogItem} from '@/features/master/plans';

export interface NovaEmpresaFormProps {
  onCancel?: () => void;
  onProvisioned?: (result: ProvisionCompanyResult) => void;
  plans: PlanCatalogItem[];
  className?: string;
}

type FieldErrors = Partial<Record<keyof ProvisionCompanyFormInput, string>>;

const initialData: ProvisionCompanyFormInput = {
  legalName: '',
  tradeName: '',
  taxId: '',
  email: '',
  phone: '',
  slug: '',
  planSlug: 'free',
  adminName: '',
  adminEmail: '',
};

function NovaEmpresaForm({onCancel, onProvisioned, plans, className}: NovaEmpresaFormProps) {
  const [data, setData] = React.useState<ProvisionCompanyFormInput>(initialData);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  function updateField<K extends keyof ProvisionCompanyFormInput>(
    field: K,
    value: ProvisionCompanyFormInput[K],
  ) {
    setData((prev) => ({...prev, [field]: value}));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = {...prev};
        delete next[field];
        return next;
      });
    }
    setFormError(null);
  }

  function handleLegalNameChange(value: string) {
    updateField('legalName', value);
    if (!data.slug || data.slug === slugify(data.legalName)) {
      updateField('slug', slugify(value));
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    const result = await provisionCompanyAction(data);

    if (!result.success) {
      setFormError(result.error);
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors as FieldErrors);
      }
      setSubmitting(false);
      return;
    }

    setData(initialData);
    setSubmitting(false);
    onProvisioned?.(result.data);
  }

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-6', className)} noValidate>
      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <fieldset className="space-y-4">
        <legend className="text-base font-semibold">Dados da empresa</legend>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            label="Nome / Razão Social"
            htmlFor="legalName"
            required
            error={fieldErrors.legalName}
          >
            <Input
              id="legalName"
              value={data.legalName}
              onChange={(e) => handleLegalNameChange(e.target.value)}
              error={Boolean(fieldErrors.legalName)}
              placeholder="Empresa Transportes Ltda"
            />
          </FormField>

          <FormField
            label="Nome Fantasia"
            htmlFor="tradeName"
            error={fieldErrors.tradeName}
          >
            <Input
              id="tradeName"
              value={data.tradeName ?? ''}
              onChange={(e) => updateField('tradeName', e.target.value)}
              error={Boolean(fieldErrors.tradeName)}
              placeholder="Nome comercial"
            />
          </FormField>

          <FormField
            label="CNPJ"
            htmlFor="taxId"
            required
            error={fieldErrors.taxId}
          >
            <Input
              id="taxId"
              value={data.taxId}
              onChange={(e) => updateField('taxId', formatTaxId(e.target.value))}
              error={Boolean(fieldErrors.taxId)}
              placeholder="00.000.000/0000-00"
            />
          </FormField>

          <FormField
            label="E-mail principal"
            htmlFor="email"
            required
            error={fieldErrors.email}
          >
            <Input
              id="email"
              type="email"
              value={data.email}
              onChange={(e) => updateField('email', e.target.value)}
              error={Boolean(fieldErrors.email)}
              placeholder="contato@empresa.com.br"
            />
          </FormField>

          <FormField
            label="Telefone"
            htmlFor="phone"
            error={fieldErrors.phone}
          >
            <Input
              id="phone"
              value={data.phone ?? ''}
              onChange={(e) => updateField('phone', e.target.value)}
              error={Boolean(fieldErrors.phone)}
              placeholder="(00) 00000-0000"
            />
          </FormField>

          <FormField
            label="Plano"
            htmlFor="planSlug"
            required
            error={fieldErrors.planSlug}
          >
            <select
              id="planSlug"
              value={data.planSlug ?? 'free'}
              onChange={(e) => updateField('planSlug', e.target.value)}
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
            >
              {plans.map((plan) => (
                <option key={plan.slug} value={plan.slug}>
                  {plan.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label="Slug"
            htmlFor="slug"
            required
            error={fieldErrors.slug}
            hint="Identificador único da empresa na plataforma"
          >
            <Input
              id="slug"
              value={data.slug}
              onChange={(e) => updateField('slug', slugify(e.target.value))}
              error={Boolean(fieldErrors.slug)}
              placeholder="minha-empresa"
            />
            {data.slug && <AccessLinkPreview slug={data.slug} className="mt-2" />}
          </FormField>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-base font-semibold">Administrador da empresa</legend>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            label="Nome"
            htmlFor="adminName"
            required
            error={fieldErrors.adminName}
          >
            <Input
              id="adminName"
              value={data.adminName}
              onChange={(e) => updateField('adminName', e.target.value)}
              error={Boolean(fieldErrors.adminName)}
              placeholder="Nome completo"
            />
          </FormField>

          <FormField
            label="E-mail"
            htmlFor="adminEmail"
            required
            error={fieldErrors.adminEmail}
            hint="Será criado no Supabase Auth com senha temporária automática"
          >
            <Input
              id="adminEmail"
              type="email"
              value={data.adminEmail}
              onChange={(e) => updateField('adminEmail', e.target.value)}
              error={Boolean(fieldErrors.adminEmail)}
              placeholder="admin@empresa.com.br"
            />
          </FormField>
        </div>
      </fieldset>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Provisionando...' : 'Cadastrar e provisionar'}
        </Button>
      </div>
    </form>
  );
}

export {NovaEmpresaForm};
