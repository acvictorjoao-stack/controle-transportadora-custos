'use client';

import {Loader2} from 'lucide-react';
import * as React from 'react';

import {FormField} from '@/components/master/shared/form-field';
import {Modal} from '@/components/master/shared/modal';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {useToast} from '@/contexts/feedback/toast-context';

import {completeTripAction} from '../actions';
import type {Trip} from '../types';
import {
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from '../utils/trip-status';

export interface TripCompleteModalProps {
  trip: Trip | null;
  open: boolean;
  onClose: () => void;
  onCompleted: () => void;
}

interface TripCompleteFormProps {
  trip: Trip;
  loading: boolean;
  onLoadingChange: (loading: boolean) => void;
  onClose: () => void;
  onCompleted: () => void;
}

function TripCompleteForm({
  trip,
  loading,
  onLoadingChange,
  onClose,
  onCompleted,
}: TripCompleteFormProps) {
  const toast = useToast();
  const [finalOdometerKm, setFinalOdometerKm] = React.useState(
    () => trip.finalOdometerKm?.toString() ?? '',
  );
  const [completedAt, setCompletedAt] = React.useState(() =>
    toDatetimeLocalValue(new Date().toISOString()),
  );
  const [completeError, setCompleteError] = React.useState<string | null>(null);
  const [completedAtError, setCompletedAtError] = React.useState<string | null>(null);
  const [finalOdometerError, setFinalOdometerError] = React.useState<string | null>(
    null,
  );

  async function handleComplete() {
    const completedAtIso = fromDatetimeLocalValue(completedAt);
    if (!completedAtIso) {
      setCompletedAtError('Informe a data e hora da conclusão.');
      return;
    }

    const finalKm = Number(finalOdometerKm.replace(',', '.'));
    if (!finalOdometerKm.trim() || !Number.isFinite(finalKm) || finalKm < 0) {
      setFinalOdometerError('Informe o KM final da viagem.');
      return;
    }
    if (trip.initialOdometerKm !== null && finalKm < trip.initialOdometerKm) {
      setFinalOdometerError('O KM final deve ser maior ou igual ao KM inicial.');
      return;
    }

    onLoadingChange(true);
    setCompleteError(null);
    setCompletedAtError(null);
    setFinalOdometerError(null);

    const result = await completeTripAction(trip.id, {
      completedAt: completedAtIso,
      finalOdometerKm: finalKm,
    });

    if (!result.success) {
      setCompleteError(result.error ?? 'Não foi possível concluir a viagem.');
      setCompletedAtError(result.fieldErrors?.completedAt ?? null);
      setFinalOdometerError(result.fieldErrors?.finalOdometerKm ?? null);
      onLoadingChange(false);
      return;
    }

    toast.success('Viagem concluída com sucesso.');
    onLoadingChange(false);
    onClose();
    onCompleted();
  }

  return (
    <div className="space-y-4">
      {completeError && (
        <Alert variant="destructive">
          <AlertDescription>{completeError}</AlertDescription>
        </Alert>
      )}
      <FormField
        label="Data/Hora da conclusão"
        htmlFor="complete-trip-completed-at"
        required
        error={completedAtError ?? undefined}
      >
        <Input
          id="complete-trip-completed-at"
          type="datetime-local"
          value={completedAt}
          onChange={(event) => {
            setCompletedAt(event.target.value);
            setCompletedAtError(null);
          }}
          disabled={loading}
        />
      </FormField>
      <FormField
        label="KM final"
        htmlFor="complete-trip-final-odometer"
        required
        error={finalOdometerError ?? undefined}
        hint={
          trip.initialOdometerKm != null
            ? `KM inicial: ${trip.initialOdometerKm.toLocaleString('pt-BR')} km`
            : undefined
        }
      >
        <Input
          id="complete-trip-final-odometer"
          type="number"
          min={trip.initialOdometerKm ?? 0}
          step="0.01"
          value={finalOdometerKm}
          onChange={(event) => {
            setFinalOdometerKm(event.target.value);
            setFinalOdometerError(null);
          }}
          disabled={loading}
        />
      </FormField>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={loading}
        >
          Voltar
        </Button>
        <Button type="button" size="sm" onClick={handleComplete} disabled={loading}>
          {loading && <Loader2 className="size-4 animate-spin" />}
          Confirmar conclusão
        </Button>
      </div>
    </div>
  );
}

function TripCompleteModal({trip, open, onClose, onCompleted}: TripCompleteModalProps) {
  const [loading, setLoading] = React.useState(false);

  return (
    <Modal
      open={open}
      onClose={() => {
        if (loading) return;
        onClose();
      }}
      title="Concluir viagem"
      description="Confirme a data, a hora e o hodômetro final da viagem."
      size="md"
    >
      {open && trip ? (
        <TripCompleteForm
          key={trip.id}
          trip={trip}
          loading={loading}
          onLoadingChange={setLoading}
          onClose={onClose}
          onCompleted={onCompleted}
        />
      ) : null}
    </Modal>
  );
}

export {TripCompleteModal};
