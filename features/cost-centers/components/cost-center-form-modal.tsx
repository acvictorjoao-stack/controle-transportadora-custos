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
import {MSG} from '@/lib/feedback/messages';

import {createCostCenterAction, updateCostCenterAction} from '../actions';
import type {CostCenter} from '../types';
import type {CreateCostCenterInput} from '../validation';

export interface CostCenterFormModalProps {
  open: boolean;
  onClose: () => void;
  costCenter?: CostCenter | null;
  onSaved: (costCenter: CostCenter) => void;
}

type FieldErrors = Partial<Record<keyof CreateCostCenterInput, string>>;

function CostCenterFormModal({
  open,
  onClose,
  costCenter,
  onSaved,
}: CostCenterFormModalProps) {
  const isEdit = Boolean(costCenter);
  const formKey = `${open}-${costCenter?.id ?? 'new'}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar centro de custo' : 'Novo centro de custo'}
      description={
        isEdit
          ? 'Atualize os dados do centro de custo'
          : 'Cadastre um novo centro para análises financeiras'
      }
    >
      <CostCenterFormContent
        key={formKey}
        costCenter={costCenter}
        isEdit={isEdit}
        onClose={onClose}
        onSaved={onSaved}
      />
    </Modal>
  );
}

function CostCenterFormContent({
  costCenter,
  isEdit,
  onClose,
  onSaved,
}: {
  costCenter?: CostCenter | null;
  isEdit: boolean;
  onClose: () => void;
  onSaved: (costCenter: CostCenter) => void;
}) {
  const [formData, setFormData] = React.useState<CreateCostCenterInput>(() => ({
    code: costCenter?.code ?? '',
    name: costCenter?.name ?? '',
    description: costCenter?.description ?? null,
  }));
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const toast = useToast();
  const codeLocked = Boolean(costCenter?.isSystem);

  function updateField<K extends keyof CreateCostCenterInput>(
    field: K,
    value: CreateCostCenterInput[K],
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

    const result =
      isEdit && costCenter
        ? await updateCostCenterAction(costCenter.id, formData)
        : await createCostCenterAction(formData);

    if (!result.success) {
      setFormError(result.error);
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors as FieldErrors);
      }
      setSubmitting(false);
      return;
    }

    onSaved(result.data);
    toast.success(
      isEdit ? MSG.updated('Centro de custo') : MSG.created('Centro de custo'),
    );
    onClose();
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Código" htmlFor="cc-code" error={fieldErrors.code} required>
          <Input
            id="cc-code"
            value={formData.code}
            onChange={(e) => updateField('code', e.target.value.toUpperCase())}
            className="uppercase"
            disabled={codeLocked}
            required
          />
        </FormField>
        <FormField label="Nome" htmlFor="cc-name" error={fieldErrors.name} required>
          <Input
            id="cc-name"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value.toUpperCase())}
            className="uppercase"
            required
          />
        </FormField>
      </div>

      <FormField
        label="Descrição"
        htmlFor="cc-description"
        error={fieldErrors.description}
      >
        <Textarea
          id="cc-description"
          value={formData.description ?? ''}
          onChange={(e) =>
            updateField('description', e.target.value.toUpperCase() || null)
          }
          className="uppercase"
          rows={3}
        />
      </FormField>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          Salvar
        </Button>
      </div>
    </form>
  );
}

export {CostCenterFormModal};
