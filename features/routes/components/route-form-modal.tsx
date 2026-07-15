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
import {MSG} from '@/lib/feedback/messages';

import {createRouteAction, updateRouteAction} from '../actions';
import {ROUTE_TYPES} from '../constants/enums';
import type {Route, RouteOperationalStatus, RouteType} from '../types';
import {
  ROUTE_OPERATIONAL_STATUS_LABELS,
  ROUTE_TYPE_LABELS,
} from '../types';
import type {CreateRouteInput} from '../validation';
import {ROUTE_NATIVE_SELECT_CLASS} from '../utils/form-styles';

export interface RouteFormModalProps {
  open: boolean;
  onClose: () => void;
  route?: Route | null;
  onSaved: (route: Route) => void;
}

type FieldErrors = Partial<Record<keyof CreateRouteInput, string>>;

function RouteFormModal({open, onClose, route, onSaved}: RouteFormModalProps) {
  const isEdit = Boolean(route);
  const formKey = `${open}-${route?.id ?? 'new'}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar rota' : 'Nova rota'}
      description={
        isEdit
          ? 'Atualize os dados da rota operacional'
          : 'Cadastre uma nova rota operacional'
      }
      size="xl"
    >
      <RouteFormContent
        key={formKey}
        route={route}
        isEdit={isEdit}
        onClose={onClose}
        onSaved={onSaved}
      />
    </Modal>
  );
}

function RouteFormContent({
  route,
  isEdit,
  onClose,
  onSaved,
}: {
  route?: Route | null;
  isEdit: boolean;
  onClose: () => void;
  onSaved: (route: Route) => void;
}) {
  const [formData, setFormData] = React.useState<CreateRouteInput>(() => ({
    name: route?.name ?? '',
    code: route?.code ?? null,
    origin: route?.origin ?? '',
    destination: route?.destination ?? '',
    routeType: route?.routeType ?? 'delivery',
    plannedDistanceKm: route?.plannedDistanceKm ?? null,
    notes: route?.notes ?? null,
    operationalStatus: route?.operationalStatus ?? 'active',
  }));
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const toast = useToast();

  function updateField<K extends keyof CreateRouteInput>(
    field: K,
    value: CreateRouteInput[K],
  ) {
    setFormData((prev) => ({...prev, [field]: value}));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = {...prev};
        delete next[field];
        return next;
      });
    }
    setFormError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    const result = isEdit && route
      ? await updateRouteAction(route.id, formData)
      : await createRouteAction(formData);

    if (!result.success) {
      setFormError(result.error ?? MSG.operationFailed);
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors as FieldErrors);
      }
      setSubmitting(false);
      return;
    }

    toast.success(isEdit ? MSG.updatedFeminine('Rota') : MSG.createdFeminine('Rota'));
    onSaved(result.data);
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

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Nome da rota"
          htmlFor="route-name"
          required
          error={fieldErrors.name}
        >
          <Input
            id="route-name"
            className="uppercase"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value.toUpperCase())}
            placeholder="Ex: São Luís → Bacabal"
          />
        </FormField>
        <FormField label="Código" htmlFor="route-code" error={fieldErrors.code}>
          <Input
            id="route-code"
            className="uppercase"
            value={formData.code ?? ''}
            onChange={(e) =>
              updateField('code', e.target.value ? e.target.value.toUpperCase() : null)
            }
            placeholder="Ex: CD116"
          />
        </FormField>
        <FormField
          label="Origem"
          htmlFor="route-origin"
          required
          error={fieldErrors.origin}
        >
          <Input
            id="route-origin"
            className="uppercase"
            value={formData.origin}
            onChange={(e) => updateField('origin', e.target.value.toUpperCase())}
            placeholder="Ex: São Luís"
          />
        </FormField>
        <FormField
          label="Destino"
          htmlFor="route-destination"
          required
          error={fieldErrors.destination}
        >
          <Input
            id="route-destination"
            className="uppercase"
            value={formData.destination}
            onChange={(e) => updateField('destination', e.target.value.toUpperCase())}
            placeholder="Ex: Bacabal"
          />
        </FormField>
        <FormField
          label="Tipo"
          htmlFor="route-type"
          required
          error={fieldErrors.routeType}
        >
          <select
            id="route-type"
            value={formData.routeType}
            onChange={(e) => updateField('routeType', e.target.value as RouteType)}
            className={ROUTE_NATIVE_SELECT_CLASS}
          >
            {ROUTE_TYPES.map((type) => (
              <option key={type} value={type}>
                {ROUTE_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </FormField>
        <FormField
          label="Status"
          htmlFor="route-status"
          error={fieldErrors.operationalStatus}
        >
          <select
            id="route-status"
            value={formData.operationalStatus ?? 'active'}
            onChange={(e) =>
              updateField(
                'operationalStatus',
                e.target.value as RouteOperationalStatus,
              )
            }
            className={ROUTE_NATIVE_SELECT_CLASS}
          >
            {(Object.keys(ROUTE_OPERATIONAL_STATUS_LABELS) as RouteOperationalStatus[]).map(
              (status) => (
                <option key={status} value={status}>
                  {ROUTE_OPERATIONAL_STATUS_LABELS[status]}
                </option>
              ),
            )}
          </select>
        </FormField>
        <FormField
          label="Distância (km)"
          htmlFor="route-distance"
          error={fieldErrors.plannedDistanceKm}
        >
          <Input
            id="route-distance"
            type="number"
            min={0}
            step="0.01"
            value={formData.plannedDistanceKm ?? ''}
            onChange={(e) =>
              updateField(
                'plannedDistanceKm',
                e.target.value === '' ? null : Number(e.target.value),
              )
            }
            placeholder="Ex: 250"
          />
        </FormField>
      </div>

      <FormField label="Observações" htmlFor="route-notes" error={fieldErrors.notes}>
        <Textarea
          id="route-notes"
          value={formData.notes ?? ''}
          onChange={(e) => updateField('notes', e.target.value || null)}
          rows={3}
          placeholder="Observações opcionais sobre a rota"
        />
      </FormField>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {isEdit ? 'Salvar' : 'Cadastrar'}
        </Button>
      </div>
    </form>
  );
}

export {RouteFormModal};
