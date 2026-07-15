'use client';

import {Loader2, Save} from 'lucide-react';
import * as React from 'react';

import {FormField} from '@/components/master/shared/form-field';
import {Modal} from '@/components/master/shared/modal';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {useToast} from '@/contexts/feedback/toast-context';

import {markAccountsReceivableReceivedAction} from '../actions';
import type {AccountsReceivableEntry} from '../types';
import type {MarkAccountsReceivableReceivedInput} from '../validation';
import {formatCurrencyInput, maskCurrencyInput, parseCurrencyInput} from '../utils/currency';

export interface AccountsReceivableReceiveModalProps {
  open: boolean;
  onClose: () => void;
  entry: AccountsReceivableEntry | null;
  onReceived: (entry: AccountsReceivableEntry) => void;
}

type FieldErrors = Partial<Record<keyof MarkAccountsReceivableReceivedInput, string>>;

function toLocalDateValue(iso: string | null | undefined): string {
  if (!iso) return new Date().toISOString().slice(0, 10);
  return iso.slice(0, 10);
}

function AccountsReceivableReceiveModal({
  open,
  onClose,
  entry,
  onReceived,
}: AccountsReceivableReceiveModalProps) {
  const formKey = `${open}-${entry?.id ?? 'none'}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Marcar como recebido"
      description="Informe a data e o valor recebido"
      size="md"
    >
      {entry && (
        <AccountsReceivableReceiveForm
          key={formKey}
          entry={entry}
          onClose={onClose}
          onReceived={onReceived}
        />
      )}
    </Modal>
  );
}

function AccountsReceivableReceiveForm({
  entry,
  onClose,
  onReceived,
}: {
  entry: AccountsReceivableEntry;
  onClose: () => void;
  onReceived: (entry: AccountsReceivableEntry) => void;
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

    const result = await markAccountsReceivableReceivedAction(entry.id, {
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

    onReceived(result.data);
    toast.success('Conta marcada como recebida');
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
        {entry.client ?? '—'} · {entry.description ?? '—'}
      </p>

      <FormField
        label="Data do recebimento"
        htmlFor="ar-paid-at"
        error={fieldErrors.paidAt}
        required
      >
        <Input
          id="ar-paid-at"
          type="date"
          value={paidAt}
          onChange={(e) => setPaidAt(e.target.value)}
          required
        />
      </FormField>

      <FormField
        label="Valor recebido"
        htmlFor="ar-paid-amount"
        error={fieldErrors.paidAmount}
        required
      >
        <Input
          id="ar-paid-amount"
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
          Confirmar recebimento
        </Button>
      </div>
    </form>
  );
}

export {AccountsReceivableReceiveModal};
