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

import {
  createAccountsPayableAction,
  updateAccountsPayableAction,
} from '../actions';
import {ACCOUNTS_PAYABLE_STATUSES} from '../constants';
import type {
  AccountsPayableCategory,
  AccountsPayableCostCenter,
  AccountsPayableEntry,
  AccountsPayableStatus,
} from '../types';
import {ACCOUNTS_PAYABLE_STATUS_LABELS} from '@/features/financial/types/financial-entry';
import type {CreateAccountsPayableInput} from '../validation';
import {formatCurrencyInput, maskCurrencyInput, parseCurrencyInput} from '../utils/currency';

export interface AccountsPayableFormModalProps {
  open: boolean;
  onClose: () => void;
  entry?: AccountsPayableEntry | null;
  categories: AccountsPayableCategory[];
  costCenters: AccountsPayableCostCenter[];
  onSaved: (entry: AccountsPayableEntry) => void;
}

type FieldErrors = Partial<Record<keyof CreateAccountsPayableInput, string>>;

function toLocalDateValue(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function AccountsPayableFormModal({
  open,
  onClose,
  entry,
  categories,
  costCenters,
  onSaved,
}: AccountsPayableFormModalProps) {
  const isEdit = Boolean(entry);
  const formKey = `${open}-${entry?.id ?? 'new'}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar conta a pagar' : 'Nova conta a pagar'}
      description={
        isEdit
          ? 'Atualize os dados da obrigação financeira'
          : 'Cadastre uma despesa administrativa sem módulo operacional próprio'
      }
      size="xl"
    >
      <AccountsPayableFormContent
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

function AccountsPayableFormContent({
  entry,
  isEdit,
  categories,
  costCenters,
  onClose,
  onSaved,
}: {
  entry?: AccountsPayableEntry | null;
  isEdit: boolean;
  categories: AccountsPayableCategory[];
  costCenters: AccountsPayableCostCenter[];
  onClose: () => void;
  onSaved: (entry: AccountsPayableEntry) => void;
}) {
  const [formData, setFormData] = React.useState(() => ({
    supplier: entry?.supplier ?? '',
    categoryId: entry?.categoryId ?? '',
    costCenterId: entry?.costCenterId ?? '',
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

  const displayStatus: AccountsPayableStatus =
    entry?.entryStatus === 'paid' || entry?.entryStatus === 'cancelled'
      ? entry.entryStatus
      : 'pending';

  function updateField<K extends keyof CreateAccountsPayableInput>(
    field: K,
    value: CreateAccountsPayableInput[K],
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

    const payload: CreateAccountsPayableInput = {
      ...formData,
      amount: parseCurrencyInput(amountDisplay) || formData.amount,
    };

    const result =
      isEdit && entry
        ? await updateAccountsPayableAction(entry.id, payload)
        : await createAccountsPayableAction(payload);

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
          <FormField label="Fornecedor" htmlFor="ap-supplier" error={fieldErrors.supplier} required>
            <Input
              id="ap-supplier"
              value={formData.supplier}
              onChange={(e) => updateField('supplier', e.target.value.toUpperCase())}
              className="uppercase"
              required
            />
          </FormField>
          <FormField label="Categoria" htmlFor="ap-category" error={fieldErrors.categoryId} required>
            <select
              id="ap-category"
              value={formData.categoryId}
              onChange={(e) => updateField('categoryId', e.target.value)}
              className={financialInputClassName}
              required
            >
              <option value="">Selecione</option>
              {categories
                .filter((category) => {
                  const slug = category.slug;
                  if (!slug) return true;
                  return ![
                    'combustivel',
                    'manutencao',
                    'pneus',
                    'multas',
                    'pedagio',
                  ].includes(slug);
                })
                .map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            label="Centro de custo"
            htmlFor="ap-cost-center"
            error={fieldErrors.costCenterId}
            required
          >
            <select
              id="ap-cost-center"
              value={formData.costCenterId ?? ''}
              onChange={(e) => updateField('costCenterId', e.target.value)}
              className={financialInputClassName}
              required
            >
              <option value="">Selecione</option>
              {costCenters.map((center) => (
                <option key={center.id} value={center.id}>
                  {center.code ? `${center.code} — ${center.name}` : center.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            label="Descrição"
            htmlFor="ap-description"
            error={fieldErrors.description}
            required
          >
            <Input
              id="ap-description"
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value.toUpperCase())}
              className="uppercase"
              required
            />
          </FormField>
        </div>
        <FormField label="Observações" htmlFor="ap-notes" error={fieldErrors.notes}>
          <Textarea
            id="ap-notes"
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
          <FormField label="Valor" htmlFor="ap-amount" error={fieldErrors.amount} required>
            <Input
              id="ap-amount"
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
            htmlFor="ap-entry-date"
            error={fieldErrors.entryDate}
            required
          >
            <Input
              id="ap-entry-date"
              type="date"
              value={formData.entryDate}
              onChange={(e) => updateField('entryDate', e.target.value)}
              required
            />
          </FormField>
          <FormField
            label="Data de vencimento"
            htmlFor="ap-due-date"
            error={fieldErrors.dueDate}
            required
          >
            <Input
              id="ap-due-date"
              type="date"
              value={formData.dueDate}
              onChange={(e) => updateField('dueDate', e.target.value)}
              required
            />
          </FormField>
          <FormField label="Situação" htmlFor="ap-status">
            <select
              id="ap-status"
              value={displayStatus}
              className={financialInputClassName}
              disabled
            >
              {ACCOUNTS_PAYABLE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {ACCOUNTS_PAYABLE_STATUS_LABELS[status]}
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

export {AccountsPayableFormModal};
