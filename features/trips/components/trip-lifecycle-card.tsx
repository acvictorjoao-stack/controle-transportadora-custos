'use client';

import {Loader2} from 'lucide-react';
import * as React from 'react';

import {FormField} from '@/components/master/shared/form-field';
import {Modal} from '@/components/master/shared/modal';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {useToast} from '@/contexts/feedback/toast-context';
import {MSG} from '@/lib/feedback/messages';

import {
  cancelTripAction,
  completeTripAction,
  startTripAction,
} from '../actions';
import type {Trip} from '../types';
import {TRIP_STATUS_INDICATORS, TRIP_STATUS_LABELS} from '../types';
import {
  canCancelTrip,
  canCompleteTrip,
  canStartTrip,
} from '../utils/trip-lifecycle';
import {formatDateTimeBr} from '../utils/trip-status';

export interface TripLifecycleCardProps {
  trip: Trip;
  onChanged: () => void;
}

function TripLifecycleCard({trip, onChanged}: TripLifecycleCardProps) {
  const toast = useToast();
  const [loading, setLoading] = React.useState<'start' | 'complete' | 'cancel' | null>(
    null,
  );
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [completeOpen, setCompleteOpen] = React.useState(false);
  const [finalOdometerKm, setFinalOdometerKm] = React.useState(
    trip.finalOdometerKm?.toString() ?? '',
  );
  const [completeError, setCompleteError] = React.useState<string | null>(null);
  const [finalOdometerError, setFinalOdometerError] = React.useState<string | null>(null);
  const [cancellationNotes, setCancellationNotes] = React.useState('');
  const [cancelError, setCancelError] = React.useState<string | null>(null);

  const showStart = canStartTrip(trip.tripStatus);
  const showComplete = canCompleteTrip(trip.tripStatus);
  const showCancel = canCancelTrip(trip.tripStatus);

  async function handleStart() {
    setLoading('start');
    const result = await startTripAction(trip.id);
    if (!result.success) {
      toast.error(result.error ?? MSG.operationFailed);
    } else {
      toast.success('Viagem iniciada com sucesso.');
      onChanged();
    }
    setLoading(null);
  }

  async function handleComplete() {
    const finalKm = Number(finalOdometerKm.replace(',', '.'));
    if (!finalOdometerKm.trim() || !Number.isFinite(finalKm) || finalKm < 0) {
      setFinalOdometerError('Informe o KM final da viagem.');
      return;
    }
    if (trip.initialOdometerKm !== null && finalKm < trip.initialOdometerKm) {
      setFinalOdometerError('O KM final deve ser maior ou igual ao KM inicial.');
      return;
    }

    setLoading('complete');
    setCompleteError(null);
    setFinalOdometerError(null);
    const result = await completeTripAction(trip.id, {finalOdometerKm: finalKm});
    if (!result.success) {
      setCompleteError(result.error ?? 'Não foi possível concluir a viagem.');
      setFinalOdometerError(result.fieldErrors?.finalOdometerKm ?? null);
    } else {
      toast.success('Viagem concluída com sucesso.');
      setCompleteOpen(false);
      onChanged();
    }
    setLoading(null);
  }

  async function handleCancel() {
    const notes = cancellationNotes.trim();
    if (!notes) {
      setCancelError('Informe a observação do cancelamento.');
      return;
    }

    setLoading('cancel');
    setCancelError(null);
    const result = await cancelTripAction(trip.id, {cancellationNotes: notes});
    if (!result.success) {
      setCancelError(result.error ?? MSG.operationFailed);
      setLoading(null);
      return;
    }

    toast.success('Viagem cancelada com sucesso.');
    setCancelOpen(false);
    setCancellationNotes('');
    setLoading(null);
    onChanged();
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xl font-semibold">
            {TRIP_STATUS_INDICATORS[trip.tripStatus]}{' '}
            {TRIP_STATUS_LABELS[trip.tripStatus]}
          </p>

          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground">Data de criação</dt>
              <dd className="text-sm font-medium">{formatDateTimeBr(trip.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Data de início</dt>
              <dd className="text-sm font-medium">{formatDateTimeBr(trip.startedAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Data de conclusão</dt>
              <dd className="text-sm font-medium">
                {formatDateTimeBr(trip.completedAt)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Data de cancelamento</dt>
              <dd className="text-sm font-medium">
                {formatDateTimeBr(trip.cancelledAt)}
              </dd>
            </div>
          </dl>

          {trip.cancellationNotes && (
            <div>
              <dt className="text-xs text-muted-foreground">Observação do cancelamento</dt>
              <dd className="mt-1 text-sm">{trip.cancellationNotes}</dd>
            </div>
          )}

          {(showStart || showComplete || showCancel) && (
            <div className="flex flex-wrap gap-2 pt-1">
              {showStart && (
                <Button size="sm" onClick={handleStart} disabled={loading !== null}>
                  {loading === 'start' && <Loader2 className="size-4 animate-spin" />}
                  Iniciar
                </Button>
              )}
              {showComplete && (
                <Button
                  size="sm"
                  onClick={() => {
                    setCompleteError(null);
                    setFinalOdometerError(null);
                    setCompleteOpen(true);
                  }}
                  disabled={loading !== null}
                >
                  Concluir
                </Button>
              )}
              {showCancel && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    setCancelError(null);
                    setCancelOpen(true);
                  }}
                  disabled={loading !== null}
                >
                  Cancelar
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        open={completeOpen}
        onClose={() => {
          if (loading === 'complete') return;
          setCompleteOpen(false);
        }}
        title="Concluir viagem"
        description="Informe o hodômetro final para encerrar a viagem."
        size="md"
      >
        <div className="space-y-4">
          {completeError && (
            <Alert variant="destructive">
              <AlertDescription>{completeError}</AlertDescription>
            </Alert>
          )}
          <FormField
            label="KM final"
            htmlFor="complete-trip-final-odometer"
            required
            error={finalOdometerError ?? undefined}
            hint={
              trip.initialOdometerKm !== null
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
              disabled={loading === 'complete'}
              autoFocus
            />
          </FormField>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCompleteOpen(false)}
              disabled={loading === 'complete'}
            >
              Voltar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleComplete}
              disabled={loading === 'complete'}
            >
              {loading === 'complete' && <Loader2 className="size-4 animate-spin" />}
              Confirmar conclusão
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={cancelOpen}
        onClose={() => {
          if (loading === 'cancel') return;
          setCancelOpen(false);
        }}
        title="Cancelar viagem"
        description="Informe a observação obrigatória do cancelamento."
        size="md"
      >
        <div className="space-y-4">
          {cancelError && (
            <Alert variant="destructive">
              <AlertDescription>{cancelError}</AlertDescription>
            </Alert>
          )}
          <Textarea
            value={cancellationNotes}
            onChange={(e) => setCancellationNotes(e.target.value)}
            placeholder="Motivo do cancelamento"
            rows={4}
            disabled={loading === 'cancel'}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCancelOpen(false)}
              disabled={loading === 'cancel'}
            >
              Voltar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleCancel}
              disabled={loading === 'cancel'}
            >
              {loading === 'cancel' && <Loader2 className="size-4 animate-spin" />}
              Confirmar cancelamento
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export {TripLifecycleCard};
