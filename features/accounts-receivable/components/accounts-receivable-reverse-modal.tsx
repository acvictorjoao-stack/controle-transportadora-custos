'use client';

import {Loader2} from 'lucide-react';
import * as React from 'react';

import {FormField} from '@/components/master/shared/form-field';
import {Modal} from '@/components/master/shared/modal';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {useToast} from '@/contexts/feedback/toast-context';
import {formatCurrencyBr} from '@/features/financial/utils/financial-format';

import {reverseReceivableReceiptAction} from '../actions';
import type {ReceivableMovement} from '../types';

export interface AccountsReceivableReverseModalProps {
  entryId: string;
  movement: ReceivableMovement | null;
  onClose: () => void;
  onReversed: () => void;
}

function AccountsReceivableReverseModal({
  entryId,
  movement,
  onClose,
  onReversed,
}: AccountsReceivableReverseModalProps) {
  return (
    <Modal
      open={movement != null}
      onClose={onClose}
      title="Estornar recebimento"
      description="O recebimento original permanece no histórico"
      size="md"
    >
      {movement && (
        <ReverseForm
          key={movement.id}
          entryId={entryId}
          movement={movement}
          onClose={onClose}
          onReversed={onReversed}
        />
      )}
    </Modal>
  );
}

function ReverseForm({
  entryId,
  movement,
  onClose,
  onReversed,
}: {
  entryId: string;
  movement: ReceivableMovement;
  onClose: () => void;
  onReversed: () => void;
}) {
  const toast = useToast();
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [idempotencyKey] = React.useState(() => crypto.randomUUID());

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await reverseReceivableReceiptAction(entryId, movement.id, {
      reason,
      idempotencyKey,
    });

    if (!result.success) {
      setError(result.fieldErrors?.reason ?? result.error);
      setSubmitting(false);
      return;
    }

    toast.success('Recebimento estornado com sucesso');
    onReversed();
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
        Valor a estornar:{' '}
        <span className="font-financial font-semibold">{formatCurrencyBr(movement.amount)}</span>
      </p>

      <FormField label="Motivo" htmlFor="ar-reverse-reason" required>
        <Textarea
          id="ar-reverse-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          required
        />
      </FormField>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Voltar
        </Button>
        <Button type="submit" variant="destructive" disabled={submitting}>
          {submitting && <Loader2 className="size-4 animate-spin" />}
          Estornar
        </Button>
      </div>
    </form>
  );
}

export {AccountsReceivableReverseModal};
