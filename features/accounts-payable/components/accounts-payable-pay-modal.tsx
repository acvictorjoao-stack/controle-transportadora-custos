'use client';

import {Loader2, Save} from 'lucide-react';
import * as React from 'react';

import {FormField} from '@/components/master/shared/form-field';
import {Modal} from '@/components/master/shared/modal';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {useToast} from '@/contexts/feedback/toast-context';

import {markAccountsPayablePaidAction} from '../actions';
import type {AccountsPayableEntry} from '../types';
import type {MarkAccountsPayablePaidInput} from '../validation';
import {formatCurrencyInput, maskCurrencyInput, parseCurrencyInput} from '../utils/currency';

export interface AccountsPayablePayModalProps {
  open: boolean;
  onClose: () => void;
  entry: AccountsPayableEntry | null;
  onPaid: (entry: AccountsPayableEntry) => void;
}

type FieldErrors = Partial<Record<keyof MarkAccountsPayablePaidInput, string>>;

function toLocalDateValue(iso: string | null | undefined): string {
  if (!iso) return new Date().toISOString().slice(0, 10);
  return iso.slice(0, 10);
}

function AccountsPayablePayModal({
  open,
  onClose,
  entry,
  onPaid,
}: AccountsPayablePayModalProps) {
  const formKey = `${open}-${entry?.id ?? 'none'}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Marcar como pago"
      description="Informe a data e o valor pago"
      size="md"
    >
      {entry && (
        <AccountsPayablePayForm
          key={formKey}
          entry={entry}
          onClose={onClose}
          onPaid={onPaid}
        />
      )}
    </Modal>
  );
}

function AccountsPayablePayForm({
  entry,
  onClose,
  onPaid,
}: {
  entry: AccountsPayableEntry;
  onClose: () => void;
  onPaid: (entry: AccountsPayableEntry) => void;
}) {
  const toast = useToast();
  const [paidAt, setPaidAt] = React.useState(toLocalDateValue(new Date().toISOString()));
  const [amountDisplay, setAmountDisplay] = React.useState(() =>
    formatCurrencyInput(entry.amount),
  );
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    const result = await markAccountsPayablePaidAction(entry.id, {
      paidAt,
      paidAmount: parseCurrencyInput(amountDisplay),
    });

    if (!result.success) {
      setFormError(result.error);
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors as FieldErrors);
      }
      setSubmitting(false);
      return;
    }

    onPaid(result.data);
    toast.success('Conta marcada como paga');
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

      <p className="text-sm text-muted-foreground">
        {entry.supplier ?? '—'} · {entry.description ?? '—'}
      </p>

      <FormField label="Data do pagamento" htmlFor="ap-paid-at" error={fieldErrors.paidAt} required>
        <Input
          id="ap-paid-at"
          type="date"
          value={paidAt}
          onChange={(e) => setPaidAt(e.target.value)}
          required
        />
      </FormField>

      <FormField label="Valor pago" htmlFor="ap-paid-amount" error={fieldErrors.paidAmount} required>
        <Input
          id="ap-paid-amount"
          inputMode="decimal"
          placeholder="0,00"
          value={amountDisplay}
          onChange={(e) => setAmountDisplay(maskCurrencyInput(e.target.value))}
          required
        />
      </FormField>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Confirmar pagamento
        </Button>
      </div>
    </form>
  );
}

export {AccountsPayablePayModal};
