'use client';

import {Loader2} from 'lucide-react';
import * as React from 'react';

import {Modal} from '@/components/master/shared/modal';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
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
    setLoading('complete');
    const result = await completeTripAction(trip.id);
    if (!result.success) {
      toast.error(result.error ?? MSG.operationFailed);
    } else {
      toast.success('Viagem concluída com sucesso.');
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
                <Button size="sm" onClick={handleComplete} disabled={loading !== null}>
                  {loading === 'complete' && <Loader2 className="size-4 animate-spin" />}
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
