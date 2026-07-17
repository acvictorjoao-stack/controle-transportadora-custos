'use client';

import {Loader2, Save} from 'lucide-react';
import * as React from 'react';

import {FormField} from '@/components/master/shared/form-field';
import {Modal} from '@/components/master/shared/modal';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {useToast} from '@/contexts/feedback/toast-context';
import {
  formatCurrencyInput,
  maskCurrencyInput,
  parseCurrencyInput,
} from '@/features/accounts-payable/utils/currency';
import type {Customer} from '@/features/customers/types';
import type {DriverSelectOption} from '@/features/drivers/types';
import type {BranchSelectOption} from '@/features/organization/branches/types';
import type {RouteSelectOption} from '@/features/routes/types';
import {formatDistanceKm} from '@/features/routes/utils/route-format';
import type {VehicleSelectOption} from '@/features/vehicles/types';
import {VEHICLE_ASSET_STATUS_LABELS} from '@/features/vehicles/types';
import {MSG} from '@/lib/feedback/messages';

import {createTripAction, updateTripAction} from '../actions';
import {TRIP_CARGO_TYPES} from '../constants/enums';
import type {Trip, TripResourceAvailability} from '../types';
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
  resourceAvailability: TripResourceAvailability;
  onSaved: (trip: Trip) => void;
}

type FieldErrors = Partial<Record<keyof CreateTripInput, string>>;

function maskWeightInput(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('pt-BR');
}

function parseWeightInput(value: string): number | null {
  const digits = value.replace(/\D/g, '');
  return digits ? Number(digits) : null;
}

function FormSection({title}: {title: string}) {
  return (
    <div className="mt-2 border-b border-border pb-1 sm:col-span-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
    </div>
  );
}

function SummaryItem({label, value}: {label: string; value: React.ReactNode}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}

function TripFormModal({
  open,
  onClose,
  trip,
  branches,
  drivers,
  vehicles,
  customers,
  routes,
  resourceAvailability,
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
        resourceAvailability={resourceAvailability}
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
  resourceAvailability,
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
  resourceAvailability: TripResourceAvailability;
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
    // Sprint 26.5 — nova viagem já abre com data/hora atuais
    plannedDepartureAt: trip ? trip.plannedDepartureAt : new Date().toISOString(),
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
  const [freightDisplay, setFreightDisplay] = React.useState(() =>
    formatCurrencyInput(trip?.actualFreightValue ?? null),
  );
  const [weightDisplay, setWeightDisplay] = React.useState(() =>
    trip?.weightKg != null ? Math.round(trip.weightKg).toLocaleString('pt-BR') : '',
  );
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

  const selectedVehicle =
    vehicles.find((vehicle) => vehicle.id === formData.vehicleId) ?? null;
  const selectedDriver =
    drivers.find((driver) => driver.id === formData.driverId) ?? null;
  const busyVehicleIds = React.useMemo(
    () => new Set(resourceAvailability.busyVehicleIds),
    [resourceAvailability.busyVehicleIds],
  );
  const busyDriverIds = React.useMemo(
    () => new Set(resourceAvailability.busyDriverIds),
    [resourceAvailability.busyDriverIds],
  );

  function getVehicleAvailability(vehicle: VehicleSelectOption): string | null {
    if (busyVehicleIds.has(vehicle.id)) return 'Em viagem';
    if (vehicle.assetStatus === 'maintenance') return 'Em manutenção';
    return null;
  }

  function getDriverAvailability(driver: DriverSelectOption): string | null {
    if (busyDriverIds.has(driver.id)) return 'Em viagem';
    if (driver.operationalStatus === 'inactive') return 'Inativo';
    return null;
  }

  function handleCustomerChange(customerId: string | null) {
    const customer = customers.find((c) => c.id === customerId);
    setFormData((prev) => ({
      ...prev,
      customerId,
      clientName: customer?.displayName ?? prev.clientName,
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
    setFormError(null);
    setFieldErrors({});

    if (
      formData.initialOdometerKm !== null &&
      formData.finalOdometerKm !== null &&
      formData.finalOdometerKm < formData.initialOdometerKm
    ) {
      setFieldErrors({
        finalOdometerKm: 'O KM final deve ser maior ou igual ao KM inicial.',
      });
      return;
    }

    setSubmitting(true);
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
        <FormSection title="Operação" />

        <FormField label="Número da viagem" htmlFor="trip-number">
          <Input
            id="trip-number"
            value={trip?.tripNumber ?? 'Gerado automaticamente'}
            readOnly
            disabled
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
          />
        </FormField>

        <FormField label="Cliente" htmlFor="trip-customer" error={fieldErrors.customerId}>
          <select
            id="trip-customer"
            value={formData.customerId ?? ''}
            onChange={(e) => handleCustomerChange(e.target.value || null)}
            className={TRIP_NATIVE_SELECT_CLASS}
          >
            <option value="">Selecione</option>
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
            placeholder="Preenchido ao selecionar o cliente"
          />
        </FormField>

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
            placeholder="Preenchida pela rota"
          />
        </FormField>
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

        <FormSection title="Recursos" />

        <FormField label="Veículo" htmlFor="trip-vehicle" error={fieldErrors.vehicleId}>
          <select
            id="trip-vehicle"
            value={formData.vehicleId ?? ''}
            onChange={(e) => updateField('vehicleId', e.target.value || null)}
            className={TRIP_NATIVE_SELECT_CLASS}
          >
            <option value="">Selecione</option>
            {vehicles.map((vehicle) => {
              const availability = getVehicleAvailability(vehicle);
              const isCurrentVehicle = isEdit && vehicle.id === trip?.vehicleId;
              return (
                <option
                  key={vehicle.id}
                  value={vehicle.id}
                  disabled={Boolean(availability) && !isCurrentVehicle}
                >
                  {vehicle.plate}
                  {availability ? ` — ${availability}` : ''}
                </option>
              );
            })}
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
            {drivers.map((driver) => {
              const availability = getDriverAvailability(driver);
              const isCurrentDriver = isEdit && driver.id === trip?.driverId;
              return (
                <option
                  key={driver.id}
                  value={driver.id}
                  disabled={Boolean(availability) && !isCurrentDriver}
                >
                  {driver.name}
                  {availability ? ` — ${availability}` : ''}
                </option>
              );
            })}
          </select>
        </FormField>

        {selectedVehicle && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Resumo do veículo
            </p>
            <div className="space-y-1.5">
              <SummaryItem label="Placa" value={selectedVehicle.plate} />
              <SummaryItem label="Tipo" value={selectedVehicle.vehicleType || '—'} />
              <SummaryItem label="Implemento" value={selectedVehicle.bodyType ?? '—'} />
              <SummaryItem
                label="Marca / Modelo"
                value={
                  [selectedVehicle.brand, selectedVehicle.model]
                    .filter(Boolean)
                    .join(' / ') || '—'
                }
              />
              <SummaryItem
                label="Capacidade de carga"
                value={
                  selectedVehicle.loadCapacityKg != null
                    ? `${Math.round(selectedVehicle.loadCapacityKg).toLocaleString('pt-BR')} kg`
                    : '—'
                }
              />
              <SummaryItem
                label="Situação"
                value={
                  <Badge
                    variant={
                      selectedVehicle.assetStatus === 'active' ? 'default' : 'secondary'
                    }
                  >
                    {VEHICLE_ASSET_STATUS_LABELS[selectedVehicle.assetStatus]}
                  </Badge>
                }
              />
            </div>
          </div>
        )}

        {selectedDriver && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Resumo do motorista
            </p>
            <div className="space-y-1.5">
              <SummaryItem label="Nome" value={selectedDriver.name} />
              <SummaryItem label="Telefone" value={selectedDriver.phone ?? '—'} />
              <SummaryItem label="CNH" value={selectedDriver.cnhNumber || '—'} />
              <SummaryItem label="Categoria" value={selectedDriver.licenseCategory} />
              <SummaryItem label="Filial" value={selectedDriver.branchName ?? '—'} />
            </div>
          </div>
        )}

        <FormSection title="Transporte" />

        <FormField label="Peso" htmlFor="trip-weight" error={fieldErrors.weightKg}>
          <div className="relative">
            <Input
              id="trip-weight"
              inputMode="numeric"
              value={weightDisplay}
              onChange={(e) => {
                const masked = maskWeightInput(e.target.value);
                setWeightDisplay(masked);
                updateField('weightKg', parseWeightInput(masked));
              }}
              className="pr-10"
              placeholder="0"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              kg
            </span>
          </div>
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
          label="Valor do frete"
          htmlFor="trip-freight-value"
          error={fieldErrors.actualFreightValue}
        >
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              R$
            </span>
            <Input
              id="trip-freight-value"
              inputMode="numeric"
              value={freightDisplay}
              onChange={(e) => {
                const masked = maskCurrencyInput(e.target.value);
                setFreightDisplay(masked);
                updateField(
                  'actualFreightValue',
                  masked ? parseCurrencyInput(masked) : null,
                );
              }}
              className="pl-9"
              placeholder="0,00"
            />
          </div>
        </FormField>

        <FormSection title="Execução" />

        <FormField
          label="KM inicial"
          htmlFor="trip-km-initial"
          error={fieldErrors.initialOdometerKm}
          hint={
            selectedVehicle
              ? `Hodômetro atual do veículo: ${selectedVehicle.currentOdometerKm.toLocaleString('pt-BR')} km`
              : undefined
          }
        >
          <Input
            id="trip-km-initial"
            type="number"
            min="0"
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
            min={formData.initialOdometerKm ?? 0}
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
        {isEdit && (
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
        )}

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
            placeholder="Opcional"
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
