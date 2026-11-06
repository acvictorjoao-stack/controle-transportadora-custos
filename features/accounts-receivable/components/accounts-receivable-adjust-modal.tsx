'use client';

import {Loader2} from 'lucide-react';
import * as React from 'react';

import {FormField} from '@/components/master/shared/form-field';
import {Modal} from '@/components/master/shared/modal';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {useToast} from '@/contexts/feedback/toast-context';
import {formatCurrencyBr} from '@/features/financial/utils/financial-format';
import {getReceivableEffectiveAmount} from '@/features/financial/utils/receivable-balance';

import {adjustReceivableAmountAction} from '../actions';
import type {AccountsReceivableEntry} from '../types';
import {maskCurrencyInput, parseCurrencyInput} from '../utils/currency';

export interface AccountsReceivableAdjustModalProps {
  open: boolean;
  entry: AccountsReceivableEntry;
  onClose: () => void;
  onAdjusted: () => void;
}

function AccountsReceivableAdjustModal({
  open,
  entry,
  onClose,
  onAdjusted,
}: AccountsReceivableAdjustModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ajustar valor"
      description={
        entry.tripChargeKey
          ? 'O ajuste também atualiza o frete da viagem'
          : 'O valor original permanece registrado'
      }
      size="md"
    >
      {open && <AdjustForm entry={entry} onClose={onClose} onAdjusted={onAdjusted} />}
    </Modal>
  );
}

function AdjustForm({
  entry,
  onClose,
  onAdjusted,
}: {
  entry: AccountsReceivableEntry;
  onClose: () => void;
  onAdjusted: () => void;
}) {
  const toast = useToast();
  const [amountDisplay, setAmountDisplay] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [idempotencyKey] = React.useState(() => crypto.randomUUID());

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await adjustReceivableAmountAction(entry.id, {
      newAmount: parseCurrencyInput(amountDisplay),
      reason,
      idempotencyKey,
    });

    if (!result.success) {
      setError(result.fieldErrors?.reason ?? result.fieldErrors?.newAmount ?? result.error);
      setSubmitting(false);
      return;
    }

    toast.success('Valor ajustado com sucesso');
    onAdjusted();
    onClose();
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <p className="text-sm">
        Valor atual:{' '}
        <span className="font-financial font-semibold">
          {formatCurrencyBr(getReceivableEffectiveAmount(entry), entry.currency)}
        </span>
      </p>

      <FormField label="Novo valor" htmlFor="ar-adjust-amount" required>
        <Input
          id="ar-adjust-amount"
          inputMode="decimal"
          placeholder="0,00"
          value={amountDisplay}
          onChange={(e) => setAmountDisplay(maskCurrencyInput(e.target.value))}
          required
        />
      </FormField>

      <FormField label="Motivo" htmlFor="ar-adjust-reason" required>
        <Textarea
          id="ar-adjust-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          required
        />
      </FormField>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="size-4 animate-spin" />}
          Aplicar ajuste
        </Button>
      </div>
    </form>
  );
}

export {AccountsReceivableAdjustModal};
