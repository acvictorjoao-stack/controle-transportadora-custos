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
import type {Customer} from '@/features/customers/types';
import type {DriverSelectOption} from '@/features/drivers/types';
import type {BranchSelectOption} from '@/features/organization/branches/types';
import type {RouteSelectOption} from '@/features/routes/types';
import {formatDistanceKm} from '@/features/routes/utils/route-format';
import type {VehicleSelectOption} from '@/features/vehicles/types';
import {MSG} from '@/lib/feedback/messages';

import {createTripAction, updateTripAction} from '../actions';
import {TRIP_CARGO_TYPES} from '../constants/enums';
import type {Trip} from '../types';
import {TRIP_STATUS_LABELS} from '../types';
import type {CreateTripInput} from '../validation';
import {TRIP_NATIVE_SELECT_CLASS} from '../utils/form-styles';
import {
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from '../utils/trip-status';

export interface TripFormModalProps {
  open: boolean;
  onClose: () => void;
  trip?: Trip | null;
  branches: BranchSelectOption[];
  drivers: DriverSelectOption[];
  vehicles: VehicleSelectOption[];
  customers: Customer[];
  routes: RouteSelectOption[];
  onSaved: (trip: Trip) => void;
}

type FieldErrors = Partial<Record<keyof CreateTripInput, string>>;

function TripFormModal({
  open,
  onClose,
  trip,
  branches,
  drivers,
  vehicles,
  customers,
  routes,
  onSaved,
}: TripFormModalProps) {
  const isEdit = Boolean(trip);
  const formKey = `${open}-${trip?.id ?? 'new'}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar viagem' : 'Nova viagem'}
      description={
        isEdit ? 'Atualize os dados da viagem' : 'Cadastre uma nova viagem operacional'
      }
      size="xl"
    >
      <TripFormContent
        key={formKey}
        trip={trip}
        isEdit={isEdit}
        branches={branches}
        drivers={drivers}
        vehicles={vehicles}
        customers={customers}
        routes={routes}
        onClose={onClose}
        onSaved={onSaved}
      />
    </Modal>
  );
}

function TripFormContent({
  trip,
  isEdit,
  branches,
  drivers,
  vehicles,
  customers,
  routes,
  onClose,
  onSaved,
}: {
  trip?: Trip | null;
  isEdit: boolean;
  branches: BranchSelectOption[];
  drivers: DriverSelectOption[];
  vehicles: VehicleSelectOption[];
  customers: Customer[];
  routes: RouteSelectOption[];
  onClose: () => void;
  onSaved: (trip: Trip) => void;
}) {
  const [formData, setFormData] = React.useState<CreateTripInput>(() => ({
    branchId: trip?.branchId ?? null,
    driverId: trip?.driverId ?? null,
    vehicleId: trip?.vehicleId ?? null,
    clientName: trip?.clientName ?? null,
    customerId: trip?.customerId ?? null,
    actualFreightValue: trip?.actualFreightValue ?? null,
    freightMargin: trip?.freightMargin ?? null,
    routeId: trip?.routeId ?? null,
    origin: trip?.origin ?? null,
    destination: trip?.destination ?? null,
    route: trip?.route ?? null,
    plannedDistanceKm: trip?.plannedDistanceKm ?? null,
    plannedDepartureAt: trip?.plannedDepartureAt ?? null,
    initialOdometerKm: trip?.initialOdometerKm ?? null,
    finalOdometerKm: trip?.finalOdometerKm ?? null,
    departedAt: trip?.departedAt ?? null,
    arrivedAt: trip?.arrivedAt ?? null,
    weightKg: trip?.weightKg ?? null,
    cargoType: trip?.cargoType ? trip.cargoType.toUpperCase() : null,
    notes: trip?.notes ?? null,
    responsible: trip?.responsible ?? null,
    tripStatus: trip?.tripStatus ?? 'planned',
  }));
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const toast = useToast();

  const routeOptions = React.useMemo(() => {
    if (!trip?.routeId) return routes;
    if (routes.some((route) => route.id === trip.routeId)) return routes;
    return [
      {
        id: trip.routeId,
        name: trip.routeName ?? trip.route ?? 'Rota vinculada',
        code: trip.routeCode,
        origin: trip.origin ?? '',
        destination: trip.destination ?? '',
        plannedDistanceKm: trip.plannedDistanceKm,
      },
      ...routes,
    ];
  }, [routes, trip]);

  const selectedRoute =
    routeOptions.find((route) => route.id === formData.routeId) ?? null;

  function handleCustomerChange(customerId: string | null) {
    const customer = customers.find((c) => c.id === customerId);
    setFormData((prev) => ({
      ...prev,
      customerId,
      clientName: customer?.displayName ?? null,
    }));
  }

  function handleRouteChange(routeId: string | null) {
    const route = routeOptions.find((item) => item.id === routeId) ?? null;
    if (!route) {
      setFormData((prev) => ({
        ...prev,
        routeId: null,
        origin: null,
        destination: null,
        route: null,
        plannedDistanceKm: null,
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      routeId: route.id,
      origin: route.origin,
      destination: route.destination,
      route: route.name,
      plannedDistanceKm: route.plannedDistanceKm,
    }));
    if (fieldErrors.routeId) {
      setFieldErrors((prev) => {
        const next = {...prev};
        delete next.routeId;
        return next;
      });
    }
  }

  function updateField<K extends keyof CreateTripInput>(
    field: K,
    value: CreateTripInput[K],
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

    const payload: CreateTripInput = {
      ...formData,
      tripStatus: isEdit ? formData.tripStatus : 'planned',
    };

    const result =
      isEdit && trip
        ? await updateTripAction(trip.id, payload)
        : await createTripAction(payload);

    if (!result.success) {
      setFormError(result.error);
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors as FieldErrors);
      }
      setSubmitting(false);
      return;
    }

    onSaved(result.data);
    toast.success(isEdit ? MSG.updatedFeminine('Viagem') : MSG.createdFeminine('Viagem'));
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
          label="Rota"
          htmlFor="trip-route-id"
          required={!isEdit || Boolean(trip?.routeId)}
          error={fieldErrors.routeId}
          className="sm:col-span-2"
        >
          <select
            id="trip-route-id"
            value={formData.routeId ?? ''}
            onChange={(e) => handleRouteChange(e.target.value || null)}
            className={TRIP_NATIVE_SELECT_CLASS}
          >
            <option value="">
              {isEdit && !trip?.routeId ? 'Sem rota cadastrada' : 'Selecione a rota'}
            </option>
            {routeOptions.map((route) => (
              <option key={route.id} value={route.id}>
                {route.code ? `${route.code} — ${route.name}` : route.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Origem" htmlFor="trip-origin" error={fieldErrors.origin}>
          <Input
            id="trip-origin"
            value={formData.origin ?? ''}
            readOnly
            disabled
            placeholder="Preenchido pela rota"
          />
        </FormField>
        <FormField
          label="Destino"
          htmlFor="trip-destination"
          error={fieldErrors.destination}
        >
          <Input
            id="trip-destination"
            value={formData.destination ?? ''}
            readOnly
            disabled
            placeholder="Preenchido pela rota"
          />
        </FormField>

        <FormField
          label="Distância"
          htmlFor="trip-planned-distance"
          error={fieldErrors.plannedDistanceKm}
        >
          <Input
            id="trip-planned-distance"
            value={
              formData.plannedDistanceKm !== null && formData.plannedDistanceKm !== undefined
                ? formatDistanceKm(formData.plannedDistanceKm)
                : ''
            }
            readOnly
            disabled
            placeholder="—"
          />
        </FormField>
        <FormField
          label="Data da viagem"
          htmlFor="trip-planned-departure"
          error={fieldErrors.plannedDepartureAt}
        >
          <Input
            id="trip-planned-departure"
            type="datetime-local"
            value={toDatetimeLocalValue(formData.plannedDepartureAt)}
            onChange={(e) =>
              updateField('plannedDepartureAt', fromDatetimeLocalValue(e.target.value))
            }
            disabled={!selectedRoute && !formData.routeId}
          />
        </FormField>

        {isEdit ? (
          <FormField label="Status" htmlFor="trip-status">
            <Input
              id="trip-status"
              value={TRIP_STATUS_LABELS[formData.tripStatus ?? 'planned']}
              disabled
              readOnly
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Use Iniciar, Concluir ou Cancelar na tela de detalhes.
            </p>
          </FormField>
        ) : (
          <FormField label="Status" htmlFor="trip-status">
            <Input
              id="trip-status"
              value={TRIP_STATUS_LABELS.planned}
              disabled
              readOnly
            />
          </FormField>
        )}
        <FormField label="Filial" htmlFor="trip-branch" error={fieldErrors.branchId}>
          <select
            id="trip-branch"
            value={formData.branchId ?? ''}
            onChange={(e) => updateField('branchId', e.target.value || null)}
            className={TRIP_NATIVE_SELECT_CLASS}
          >
            <option value="">Selecione</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Motorista" htmlFor="trip-driver" error={fieldErrors.driverId}>
          <select
            id="trip-driver"
            value={formData.driverId ?? ''}
            onChange={(e) => updateField('driverId', e.target.value || null)}
            className={TRIP_NATIVE_SELECT_CLASS}
          >
            <option value="">Selecione</option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Veículo" htmlFor="trip-vehicle" error={fieldErrors.vehicleId}>
          <select
            id="trip-vehicle"
            value={formData.vehicleId ?? ''}
            onChange={(e) => updateField('vehicleId', e.target.value || null)}
            className={TRIP_NATIVE_SELECT_CLASS}
          >
            <option value="">Selecione</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.plate}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Cliente" htmlFor="trip-customer" error={fieldErrors.customerId}>
          <select
            id="trip-customer"
            value={formData.customerId ?? ''}
            onChange={(e) => handleCustomerChange(e.target.value || null)}
            className={TRIP_NATIVE_SELECT_CLASS}
          >
            <option value="">Selecione ou informe abaixo</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.displayName}
              </option>
            ))}
          </select>
        </FormField>
        <FormField
          label="Nome do cliente (livre)"
          htmlFor="trip-client"
          error={fieldErrors.clientName}
        >
          <Input
            id="trip-client"
            value={formData.clientName ?? ''}
            onChange={(e) => updateField('clientName', e.target.value || null)}
          />
        </FormField>
        <FormField
          label="Valor do frete"
          htmlFor="trip-freight-value"
          error={fieldErrors.actualFreightValue}
        >
          <Input
            id="trip-freight-value"
            type="number"
            step="0.01"
            value={formData.actualFreightValue ?? ''}
            onChange={(e) =>
              updateField(
                'actualFreightValue',
                e.target.value ? Number(e.target.value) : null,
              )
            }
          />
        </FormField>
        <FormField
          label="KM inicial"
          htmlFor="trip-km-initial"
          error={fieldErrors.initialOdometerKm}
        >
          <Input
            id="trip-km-initial"
            type="number"
            step="0.01"
            value={formData.initialOdometerKm ?? ''}
            onChange={(e) =>
              updateField(
                'initialOdometerKm',
                e.target.value ? Number(e.target.value) : null,
              )
            }
          />
        </FormField>
        <FormField
          label="KM final"
          htmlFor="trip-km-final"
          error={fieldErrors.finalOdometerKm}
        >
          <Input
            id="trip-km-final"
            type="number"
            step="0.01"
            value={formData.finalOdometerKm ?? ''}
            onChange={(e) =>
              updateField(
                'finalOdometerKm',
                e.target.value ? Number(e.target.value) : null,
              )
            }
          />
        </FormField>
        <FormField label="Saída real" htmlFor="trip-departed" error={fieldErrors.departedAt}>
          <Input
            id="trip-departed"
            type="datetime-local"
            value={toDatetimeLocalValue(formData.departedAt)}
            onChange={(e) =>
              updateField('departedAt', fromDatetimeLocalValue(e.target.value))
            }
          />
        </FormField>
        <FormField label="Chegada real" htmlFor="trip-arrived" error={fieldErrors.arrivedAt}>
          <Input
            id="trip-arrived"
            type="datetime-local"
            value={toDatetimeLocalValue(formData.arrivedAt)}
            onChange={(e) =>
              updateField('arrivedAt', fromDatetimeLocalValue(e.target.value))
            }
          />
        </FormField>
        <FormField label="Peso (kg)" htmlFor="trip-weight" error={fieldErrors.weightKg}>
          <Input
            id="trip-weight"
            type="number"
            step="0.01"
            value={formData.weightKg ?? ''}
            onChange={(e) =>
              updateField('weightKg', e.target.value ? Number(e.target.value) : null)
            }
          />
        </FormField>
        <FormField
          label="Tipo da carga"
          htmlFor="trip-cargo-type"
          error={fieldErrors.cargoType}
        >
          <select
            id="trip-cargo-type"
            value={formData.cargoType ?? ''}
            onChange={(e) => updateField('cargoType', e.target.value || null)}
            className={TRIP_NATIVE_SELECT_CLASS}
          >
            <option value="">Selecione</option>
            {formData.cargoType &&
              !TRIP_CARGO_TYPES.includes(
                formData.cargoType as (typeof TRIP_CARGO_TYPES)[number],
              ) && <option value={formData.cargoType}>{formData.cargoType}</option>}
            {TRIP_CARGO_TYPES.map((cargoType) => (
              <option key={cargoType} value={cargoType}>
                {cargoType}
              </option>
            ))}
          </select>
        </FormField>
        <FormField
          label="Responsável"
          htmlFor="trip-responsible"
          error={fieldErrors.responsible}
        >
          <Input
            id="trip-responsible"
            value={formData.responsible ?? ''}
            onChange={(e) => updateField('responsible', e.target.value || null)}
          />
        </FormField>
        <FormField
          label="Observações"
          htmlFor="trip-notes"
          error={fieldErrors.notes}
          className="sm:col-span-2"
        >
          <Textarea
            id="trip-notes"
            value={formData.notes ?? ''}
            onChange={(e) => updateField('notes', e.target.value || null)}
            rows={3}
          />
        </FormField>
      </div>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
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

export {TripFormModal};
