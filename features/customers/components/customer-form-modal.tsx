'use client';

import {Loader2, Save} from 'lucide-react';
import * as React from 'react';

import {FormField} from '@/components/master/shared/form-field';
import {Modal} from '@/components/master/shared/modal';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {useToast} from '@/contexts/feedback/toast-context';
import type {BranchSelectOption} from '@/features/organization/branches/types';

import {createCustomerAction, updateCustomerAction} from '../actions';
import {CUSTOMER_SEGMENTS, CUSTOMER_STATUSES} from '../constants/enums';
import type {Customer, CustomerSegment, CustomerStatus} from '../types';
import {CUSTOMER_SEGMENT_LABELS, CUSTOMER_STATUS_LABELS} from '../types';
import type {CreateCustomerInput} from '../validation';
import {CUSTOMER_NATIVE_SELECT_CLASS} from '../utils/form-styles';

export interface CustomerFormModalProps {
  open: boolean;
  onClose: () => void;
  customer?: Customer | null;
  branches: BranchSelectOption[];
  onSaved: () => void;
}

type FieldErrors = Partial<Record<keyof CreateCustomerInput, string>>;

function CustomerFormModal({open, onClose, customer, branches, onSaved}: CustomerFormModalProps) {
  const isEdit = Boolean(customer);
  const formKey = `${open}-${customer?.id ?? 'new'}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar cliente' : 'Novo cliente'}
      description={isEdit ? 'Atualize os dados do cliente' : 'Cadastre um novo cliente'}
      size="xl"
    >
      <CustomerFormContent
        key={formKey}
        customer={customer}
        isEdit={isEdit}
        branches={branches}
        onClose={onClose}
        onSaved={onSaved}
      />
    </Modal>
  );
}

function CustomerFormContent({
  customer,
  isEdit,
  branches,
  onClose,
  onSaved,
}: {
  customer?: Customer | null;
  isEdit: boolean;
  branches: BranchSelectOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [formData, setFormData] = React.useState<CreateCustomerInput>(() => ({
    legalName: customer?.legalName ?? '',
    tradeName: customer?.tradeName ?? null,
    taxId: customer?.taxId ?? null,
    stateRegistration: customer?.stateRegistration ?? null,
    municipalRegistration: customer?.municipalRegistration ?? null,
    email: customer?.email ?? null,
    phone: customer?.phone ?? null,
    whatsapp: customer?.whatsapp ?? null,
    website: customer?.website ?? null,
    customerStatus: customer?.customerStatus ?? 'active',
    segment: customer?.segment ?? null,
    notes: customer?.notes ?? null,
    salesRepresentative: customer?.salesRepresentative ?? null,
    creditLimit: customer?.creditLimit ?? null,
    paymentTermDays: customer?.paymentTermDays ?? null,
    branchId: customer?.branchId ?? null,
  }));
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const toast = useToast();

  function updateField<K extends keyof CreateCustomerInput>(field: K, value: CreateCustomerInput[K]) {
    setFormData((prev) => ({...prev, [field]: value}));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = {...prev};
        delete next[field];
        return next;
      });
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);

    const result = isEdit && customer
      ? await updateCustomerAction(customer.id, formData)
      : await createCustomerAction(formData);

    setSubmitting(false);

    if (!result.success) {
      setFormError(result.error);
      if (result.fieldErrors) setFieldErrors(result.fieldErrors as FieldErrors);
      return;
    }

    onSaved();
    toast.success(isEdit ? 'Cliente atualizado com sucesso' : 'Cliente criado com sucesso');
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Razão Social" htmlFor="customer-legal-name" error={fieldErrors.legalName} required>
          <Input
            id="customer-legal-name"
            value={formData.legalName}
            onChange={(e) => updateField('legalName', e.target.value)}
          />
        </FormField>
        <FormField label="Nome Fantasia" htmlFor="customer-trade-name" error={fieldErrors.tradeName}>
          <Input
            id="customer-trade-name"
            value={formData.tradeName ?? ''}
            onChange={(e) => updateField('tradeName', e.target.value || null)}
          />
        </FormField>
        <FormField label="CNPJ" htmlFor="customer-tax-id" error={fieldErrors.taxId}>
          <Input
            id="customer-tax-id"
            value={formData.taxId ?? ''}
            onChange={(e) => updateField('taxId', e.target.value || null)}
          />
        </FormField>
        <FormField label="Status" htmlFor="customer-status" error={fieldErrors.customerStatus}>
          <select
            id="customer-status"
            className={CUSTOMER_NATIVE_SELECT_CLASS}
            value={formData.customerStatus ?? 'active'}
            onChange={(e) => updateField('customerStatus', e.target.value as CustomerStatus)}
          >
            {CUSTOMER_STATUSES.map((s) => (
              <option key={s} value={s}>{CUSTOMER_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </FormField>
        <FormField label="IE" htmlFor="customer-ie" error={fieldErrors.stateRegistration}>
          <Input id="customer-ie" value={formData.stateRegistration ?? ''} onChange={(e) => updateField('stateRegistration', e.target.value || null)} />
        </FormField>
        <FormField label="IM" htmlFor="customer-im" error={fieldErrors.municipalRegistration}>
          <Input id="customer-im" value={formData.municipalRegistration ?? ''} onChange={(e) => updateField('municipalRegistration', e.target.value || null)} />
        </FormField>
        <FormField label="E-mail" htmlFor="customer-email" error={fieldErrors.email}>
          <Input id="customer-email" type="email" value={formData.email ?? ''} onChange={(e) => updateField('email', e.target.value || null)} />
        </FormField>
        <FormField label="Telefone" htmlFor="customer-phone" error={fieldErrors.phone}>
          <Input id="customer-phone" value={formData.phone ?? ''} onChange={(e) => updateField('phone', e.target.value || null)} />
        </FormField>
        <FormField label="WhatsApp" htmlFor="customer-whatsapp" error={fieldErrors.whatsapp}>
          <Input id="customer-whatsapp" value={formData.whatsapp ?? ''} onChange={(e) => updateField('whatsapp', e.target.value || null)} />
        </FormField>
        <FormField label="Site" htmlFor="customer-website" error={fieldErrors.website}>
          <Input id="customer-website" value={formData.website ?? ''} onChange={(e) => updateField('website', e.target.value || null)} />
        </FormField>
        <FormField label="Segmento" htmlFor="customer-segment" error={fieldErrors.segment}>
          <select
            id="customer-segment"
            className={CUSTOMER_NATIVE_SELECT_CLASS}
            value={formData.segment ?? ''}
            onChange={(e) => updateField('segment', (e.target.value || null) as CustomerSegment | null)}
          >
            <option value="">—</option>
            {CUSTOMER_SEGMENTS.map((s) => (
              <option key={s} value={s}>{CUSTOMER_SEGMENT_LABELS[s]}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Responsável Comercial" htmlFor="customer-sales-rep" error={fieldErrors.salesRepresentative}>
          <Input id="customer-sales-rep" value={formData.salesRepresentative ?? ''} onChange={(e) => updateField('salesRepresentative', e.target.value || null)} />
        </FormField>
        <FormField label="Limite de Crédito" htmlFor="customer-credit-limit" error={fieldErrors.creditLimit}>
          <Input
            id="customer-credit-limit"
            type="number"
            step="0.01"
            value={formData.creditLimit ?? ''}
            onChange={(e) => updateField('creditLimit', e.target.value ? Number(e.target.value) : null)}
          />
        </FormField>
        <FormField label="Prazo de Pagamento (dias)" htmlFor="customer-payment-term" error={fieldErrors.paymentTermDays}>
          <Input
            id="customer-payment-term"
            type="number"
            value={formData.paymentTermDays ?? ''}
            onChange={(e) => updateField('paymentTermDays', e.target.value ? Number(e.target.value) : null)}
          />
        </FormField>
        <FormField label="Filial" htmlFor="customer-branch" error={fieldErrors.branchId}>
          <select
            id="customer-branch"
            className={CUSTOMER_NATIVE_SELECT_CLASS}
            value={formData.branchId ?? ''}
            onChange={(e) => updateField('branchId', e.target.value || null)}
          >
            <option value="">—</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField label="Observações" htmlFor="customer-notes" error={fieldErrors.notes}>
        <Textarea
          id="customer-notes"
          rows={3}
          value={formData.notes ?? ''}
          onChange={(e) => updateField('notes', e.target.value || null)}
        />
      </FormField>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Salvar
        </Button>
      </div>
    </form>
  );
}

export {CustomerFormModal};
