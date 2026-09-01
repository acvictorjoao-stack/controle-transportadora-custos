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
import {financialInputClassName} from '@/features/financial/utils/form-styles';
import {MSG} from '@/lib/feedback/messages';

import {createPositionAction, updatePositionAction} from '../actions';
import type {Position} from '../types';
import {PERSONNEL_STATUS_LABELS} from '../types';
import type {CreatePositionInput} from '../validation';

export interface PositionFormModalProps {
  open: boolean;
  onClose: () => void;
  position?: Position | null;
  onSaved: () => void;
}

type FieldErrors = Partial<Record<keyof CreatePositionInput, string>>;

function PositionFormModal({open, onClose, position, onSaved}: PositionFormModalProps) {
  const isEdit = Boolean(position);
  const formKey = `${open}-${position?.id ?? 'new'}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar cargo' : 'Novo cargo'}
      description={
        isEdit
          ? 'Atualize os dados do cargo'
          : 'Cadastre um cargo para colaboradores e folha de pagamento'
      }
    >
      <PositionFormContent
        key={formKey}
        position={position}
        isEdit={isEdit}
        onClose={onClose}
        onSaved={onSaved}
      />
    </Modal>
  );
}

function PositionFormContent({
  position,
  isEdit,
  onClose,
  onSaved,
}: {
  position?: Position | null;
  isEdit: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [formData, setFormData] = React.useState<CreatePositionInput>(() => ({
    code: position?.code ?? null,
    name: position?.name ?? '',
    description: position?.description ?? null,
    status: position?.status === 'inactive' ? 'inactive' : 'active',
  }));
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const toast = useToast();
  const codeLocked = Boolean(position?.isSystem);

  function updateField<K extends keyof CreatePositionInput>(
    field: K,
    value: CreatePositionInput[K],
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
      isEdit && position
        ? await updatePositionAction(position.id, formData)
        : await createPositionAction(formData);

    if (!result.success) {
      setFormError(result.error);
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors as FieldErrors);
      }
      setSubmitting(false);
      return;
    }

    onSaved();
    toast.success(isEdit ? MSG.updated('Cargo') : MSG.created('Cargo'));
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

      <FormField label="Nome" htmlFor="pos-name" error={fieldErrors.name} required>
        <Input
          id="pos-name"
          value={formData.name}
          onChange={(e) => updateField('name', e.target.value.toUpperCase())}
          className="uppercase"
          required
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Código" htmlFor="pos-code" error={fieldErrors.code}>
          <Input
            id="pos-code"
            value={formData.code ?? ''}
            onChange={(e) => updateField('code', e.target.value.toUpperCase() || null)}
            className="uppercase"
            disabled={codeLocked}
            placeholder="Opcional"
          />
        </FormField>

        <FormField label="Status" htmlFor="pos-status" error={fieldErrors.status}>
          <select
            id="pos-status"
            value={formData.status}
            onChange={(e) =>
              updateField('status', e.target.value as CreatePositionInput['status'])
            }
            className={financialInputClassName}
          >
            <option value="active">{PERSONNEL_STATUS_LABELS.active}</option>
            <option value="inactive">{PERSONNEL_STATUS_LABELS.inactive}</option>
          </select>
        </FormField>
      </div>

      <FormField label="Descrição" htmlFor="pos-description" error={fieldErrors.description}>
        <Textarea
          id="pos-description"
          value={formData.description ?? ''}
          onChange={(e) => updateField('description', e.target.value.toUpperCase() || null)}
          className="uppercase"
          rows={3}
        />
      </FormField>

      {codeLocked ? (
        <p className="text-xs text-muted-foreground">
          Cargos do sistema não podem ter o código alterado nem ser excluídos.
        </p>
      ) : null}

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

export {PositionFormModal};
