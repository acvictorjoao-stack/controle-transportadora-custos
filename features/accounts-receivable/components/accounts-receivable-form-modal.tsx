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
import {ACCOUNTS_RECEIVABLE_STATUS_LABELS} from '@/features/financial/types/financial-entry';
import {financialInputClassName} from '@/features/financial/utils/form-styles';

import {
  createAccountsReceivableAction,
  updateAccountsReceivableAction,
} from '../actions';
import {ACCOUNTS_RECEIVABLE_STATUSES} from '../constants';
import type {
  AccountsReceivableCategory,
  AccountsReceivableCostCenter,
  AccountsReceivableEntry,
  AccountsReceivableStatus,
} from '../types';
import type {CreateAccountsReceivableInput} from '../validation';
import {formatCurrencyInput, maskCurrencyInput, parseCurrencyInput} from '../utils/currency';

export interface AccountsReceivableFormModalProps {
  open: boolean;
  onClose: () => void;
  entry?: AccountsReceivableEntry | null;
  categories: AccountsReceivableCategory[];
  costCenters: AccountsReceivableCostCenter[];
  onSaved: (entry: AccountsReceivableEntry) => void;
}

type FieldErrors = Partial<Record<keyof CreateAccountsReceivableInput, string>>;

function toLocalDateValue(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function AccountsReceivableFormModal({
  open,
  onClose,
  entry,
  categories,
  costCenters,
  onSaved,
}: AccountsReceivableFormModalProps) {
  const isEdit = Boolean(entry);
  const formKey = `${open}-${entry?.id ?? 'new'}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar conta a receber' : 'Nova conta a receber'}
      description={
        isEdit
          ? 'Atualize os dados do recebível'
          : 'Cadastre um novo recebível'
      }
      size="xl"
    >
      <AccountsReceivableFormContent
        key={formKey}
        entry={entry}
        isEdit={isEdit}
        categories={categories}
        costCenters={costCenters}
        onClose={onClose}
        onSaved={onSaved}
      />
    </Modal>
  );
}

function AccountsReceivableFormContent({
  entry,
  isEdit,
  categories,
  costCenters,
  onClose,
  onSaved,
}: {
  entry?: AccountsReceivableEntry | null;
  isEdit: boolean;
  categories: AccountsReceivableCategory[];
  costCenters: AccountsReceivableCostCenter[];
  onClose: () => void;
  onSaved: (entry: AccountsReceivableEntry) => void;
}) {
  const [formData, setFormData] = React.useState(() => ({
    client: entry?.client ?? '',
    categoryId: entry?.categoryId ?? '',
    costCenterId: entry?.costCenterId ?? null,
    description: entry?.description ?? '',
    notes: entry?.notes ?? null,
    amount: entry?.amount ?? 0,
    entryDate: entry?.entryDate
      ? toLocalDateValue(entry.entryDate)
      : toLocalDateValue(new Date().toISOString()),
    dueDate: entry?.dueDate ? toLocalDateValue(entry.dueDate) : '',
  }));
  const [amountDisplay, setAmountDisplay] = React.useState(() =>
    formatCurrencyInput(entry?.amount ?? 0),
  );
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const toast = useToast();

  const displayStatus: AccountsReceivableStatus =
    entry?.entryStatus === 'paid' || entry?.entryStatus === 'cancelled'
      ? entry.entryStatus
      : 'pending';

  function updateField<K extends keyof CreateAccountsReceivableInput>(
    field: K,
    value: CreateAccountsReceivableInput[K],
  ) {
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
    setFieldErrors({});

    const payload: CreateAccountsReceivableInput = {
      ...formData,
      amount: parseCurrencyInput(amountDisplay) || formData.amount,
    };

    const result =
      isEdit && entry
        ? await updateAccountsReceivableAction(entry.id, payload)
        : await createAccountsReceivableAction(payload);

    if (!result.success) {
      setFormError(result.error);
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors as FieldErrors);
      }
      setSubmitting(false);
      return;
    }

    onSaved(result.data);
    toast.success(isEdit ? 'Conta atualizada com sucesso' : 'Conta criada com sucesso');
    onClose();
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Informações Gerais
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Cliente" htmlFor="ar-client" error={fieldErrors.client} required>
            <Input
              id="ar-client"
              value={formData.client}
              onChange={(e) => updateField('client', e.target.value.toUpperCase())}
              className="uppercase"
              required
            />
          </FormField>
          <FormField label="Categoria" htmlFor="ar-category" error={fieldErrors.categoryId} required>
            <select
              id="ar-category"
              value={formData.categoryId}
              onChange={(e) => updateField('categoryId', e.target.value)}
              className={financialInputClassName}
              required
            >
              <option value="">Selecione</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            label="Centro de custo"
            htmlFor="ar-cost-center"
            error={fieldErrors.costCenterId}
          >
            <select
              id="ar-cost-center"
              value={formData.costCenterId ?? ''}
              onChange={(e) => updateField('costCenterId', e.target.value || null)}
              className={financialInputClassName}
            >
              <option value="">Sem centro de custo</option>
              {costCenters.map((center) => (
                <option key={center.id} value={center.id}>
                  {center.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            label="Descrição"
            htmlFor="ar-description"
            error={fieldErrors.description}
            required
          >
            <Input
              id="ar-description"
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value.toUpperCase())}
              className="uppercase"
              required
            />
          </FormField>
        </div>
        <FormField label="Observações" htmlFor="ar-notes" error={fieldErrors.notes}>
          <Textarea
            id="ar-notes"
            value={formData.notes ?? ''}
            onChange={(e) => updateField('notes', e.target.value.toUpperCase() || null)}
            className="uppercase"
            rows={3}
          />
        </FormField>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Financeiro
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Valor previsto"
            htmlFor="ar-amount"
            error={fieldErrors.amount}
            required
          >
            <Input
              id="ar-amount"
              inputMode="decimal"
              placeholder="0,00"
              value={amountDisplay}
              onChange={(e) => {
                const masked = maskCurrencyInput(e.target.value);
                setAmountDisplay(masked);
                updateField('amount', parseCurrencyInput(masked));
              }}
              required
            />
          </FormField>
          <FormField
            label="Data de emissão"
            htmlFor="ar-entry-date"
            error={fieldErrors.entryDate}
            required
          >
            <Input
              id="ar-entry-date"
              type="date"
              value={formData.entryDate}
              onChange={(e) => updateField('entryDate', e.target.value)}
              required
            />
          </FormField>
          <FormField
            label="Data de vencimento"
            htmlFor="ar-due-date"
            error={fieldErrors.dueDate}
            required
          >
            <Input
              id="ar-due-date"
              type="date"
              value={formData.dueDate}
              onChange={(e) => updateField('dueDate', e.target.value)}
              required
            />
          </FormField>
          <FormField label="Situação" htmlFor="ar-status">
            <select
              id="ar-status"
              value={displayStatus}
              className={financialInputClassName}
              disabled
            >
              {ACCOUNTS_RECEIVABLE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {ACCOUNTS_RECEIVABLE_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </FormField>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
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

export {AccountsReceivableFormModal};
