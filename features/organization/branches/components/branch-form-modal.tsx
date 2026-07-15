'use client';

import {Loader2, Save} from 'lucide-react';
import * as React from 'react';

import {FormField} from '@/components/master/shared/form-field';
import {Modal} from '@/components/master/shared/modal';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {useToast} from '@/contexts/feedback/toast-context';
import {
  formatPhoneInput,
  normalizePhoneDigits,
} from '@/features/customers/utils/customer-format';
import {formatTaxId} from '@/features/master/companies/utils/format';
import {MSG} from '@/lib/feedback/messages';

import {createBranchAction, updateBranchAction} from '../actions';
import type {Branch} from '../types';
import type {CreateBranchInput, UpdateBranchInput} from '../validation';

export interface BranchFormModalProps {
  open: boolean;
  onClose: () => void;
  branch?: Branch | null;
  onSaved: (branch: Branch) => void;
}

type FieldErrors = Partial<Record<keyof CreateBranchInput, string>>;

function BranchFormModal({open, onClose, branch, onSaved}: BranchFormModalProps) {
  const isEdit = Boolean(branch);
  const formKey = `${open}-${branch?.id ?? 'new'}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar filial' : 'Nova filial'}
      description={isEdit ? 'Atualize os dados da filial' : 'Cadastre uma nova unidade operacional'}
    >
      <BranchFormContent
        key={formKey}
        branch={branch}
        isEdit={isEdit}
        onClose={onClose}
        onSaved={onSaved}
      />
    </Modal>
  );
}

function BranchFormContent({
  branch,
  isEdit,
  onClose,
  onSaved,
}: {
  branch?: Branch | null;
  isEdit: boolean;
  onClose: () => void;
  onSaved: (branch: Branch) => void;
}) {
  const [formData, setFormData] = React.useState<CreateBranchInput>(() => ({
    code: branch?.code ?? '',
    name: branch?.name ?? '',
    taxId: branch?.taxId ?? null,
    addressStreet: branch?.addressStreet ?? null,
    phone: branch?.phone ?? null,
    responsibleName: branch?.responsibleName ?? null,
    isHeadquarters: branch?.isHeadquarters ?? false,
  }));
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const toast = useToast();

  function updateField<K extends keyof CreateBranchInput>(
    field: K,
    value: CreateBranchInput[K],
  ) {
    setFormData((prev) => ({...prev, [field]: value}));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = {...prev};
        delete next[field];
        return next;
      });
    }
    setFormError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    const result = isEdit && branch
      ? await updateBranchAction(branch.id, formData as UpdateBranchInput)
      : await createBranchAction(formData);

    if (!result.success) {
      setFormError(result.error ?? MSG.operationFailed);
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors as FieldErrors);
      }
      setSubmitting(false);
      return;
    }

    onSaved(result.data);
    toast.success(
      isEdit ? MSG.updatedFeminine('Filial') : MSG.createdFeminine('Filial'),
    );
    setSubmitting(false);
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Código" htmlFor="code" required error={fieldErrors.code}>
            <Input
              id="code"
              className="uppercase"
              value={formData.code}
              onChange={(e) => updateField('code', e.target.value.toUpperCase())}
              disabled={branch?.isHeadquarters}
            />
          </FormField>
          <FormField label="Nome" htmlFor="name" required error={fieldErrors.name}>
            <Input
              id="name"
              className="uppercase"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value.toUpperCase())}
            />
          </FormField>
          <FormField label="CNPJ" htmlFor="taxId" error={fieldErrors.taxId}>
            <Input
              id="taxId"
              value={formData.taxId ? formatTaxId(formData.taxId) : ''}
              onChange={(e) => updateField('taxId', e.target.value || null)}
            />
          </FormField>
          <FormField label="Telefone" htmlFor="phone" error={fieldErrors.phone}>
            <Input
              id="phone"
              value={formatPhoneInput(formData.phone)}
              onChange={(e) => updateField('phone', normalizePhoneDigits(e.target.value))}
            />
          </FormField>
          <FormField label="Responsável" htmlFor="responsibleName" error={fieldErrors.responsibleName} className="sm:col-span-2">
            <Input
              id="responsibleName"
              className="uppercase"
              value={formData.responsibleName ?? ''}
              onChange={(e) =>
                updateField(
                  'responsibleName',
                  e.target.value ? e.target.value.toUpperCase() : null,
                )
              }
            />
          </FormField>
          <FormField label="Endereço" htmlFor="addressStreet" error={fieldErrors.addressStreet} className="sm:col-span-2">
            <Input
              id="addressStreet"
              className="uppercase"
              value={formData.addressStreet ?? ''}
              onChange={(e) =>
                updateField(
                  'addressStreet',
                  e.target.value ? e.target.value.toUpperCase() : null,
                )
              }
            />
          </FormField>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {isEdit ? 'Salvar' : 'Cadastrar'}
          </Button>
        </div>
      </form>
  );
}

export {BranchFormModal};
