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
import {localDateIso} from '@/features/financial-dashboard/utils/dates';
import {formatCurrencyBr} from '@/features/financial/utils/financial-format';
import {financialInputClassName} from '@/features/financial/utils/form-styles';
import {getReceivableBalance} from '@/features/financial/utils/receivable-balance';

import {markAccountsReceivableReceivedAction} from '../actions';
import {RECEIVABLE_PAYMENT_METHOD_LABELS, RECEIVABLE_PAYMENT_METHODS} from '../constants';
import type {AccountsReceivableEntry, ReceivablePaymentMethod} from '../types';
import type {MarkAccountsReceivableReceivedInput} from '../validation';
import {formatCurrencyInput, maskCurrencyInput, parseCurrencyInput} from '../utils/currency';

export interface AccountsReceivableReceiveModalProps {
  open: boolean;
  onClose: () => void;
  entry: AccountsReceivableEntry | null;
  onReceived: (entry: AccountsReceivableEntry) => void;
}

type FieldErrors = Partial<Record<keyof MarkAccountsReceivableReceivedInput, string>>;

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
      title="Registrar recebimento"
      description="Recebimento parcial mantém o título aberto até a quitação"
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
  const [paidAt, setPaidAt] = React.useState(() => localDateIso());
  const balance = getReceivableBalance(entry);
  const [amountDisplay, setAmountDisplay] = React.useState(() =>
    formatCurrencyInput(balance),
  );
  const [paymentMethod, setPaymentMethod] = React.useState<ReceivablePaymentMethod | ''>('');
  const [notes, setNotes] = React.useState('');
  // Mantida entre tentativas: reenviar após falha de conexão não duplica.
  const [idempotencyKey] = React.useState(() => crypto.randomUUID());
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
      paymentMethod: paymentMethod || null,
      notes,
      idempotencyKey,
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
    toast.success('Recebimento registrado com sucesso');
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

      <p className="text-sm">
        Saldo em aberto:{' '}
        <span className="font-financial font-semibold">
          {formatCurrencyBr(balance, entry.currency)}
        </span>
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

      <FormField label="Forma de pagamento" htmlFor="ar-payment-method">
        <select
          id="ar-payment-method"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value as ReceivablePaymentMethod | '')}
          className={financialInputClassName}
        >
          <option value="">Não informada</option>
          {RECEIVABLE_PAYMENT_METHODS.map((method) => (
            <option key={method} value={method}>
              {RECEIVABLE_PAYMENT_METHOD_LABELS[method]}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Observação" htmlFor="ar-receipt-notes">
        <Textarea
          id="ar-receipt-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </FormField>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Registrar recebimento
        </Button>
      </div>
    </form>
  );
}

export {AccountsReceivableReceiveModal};
