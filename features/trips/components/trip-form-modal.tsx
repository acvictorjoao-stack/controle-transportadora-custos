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
import type {BranchSelectOption} from '@/features/organization/branches/types';
import type {Customer, CustomerContract} from '@/features/customers/types';
import type {DriverSelectOption} from '@/features/drivers/types';
import type {VehicleSelectOption} from '@/features/vehicles/types';

import {createTripAction, updateTripAction} from '../actions';
import {resolveContractFreightAction} from '@/features/customers/actions';
import {TRIP_STATUSES} from '../constants/enums';
import type {Trip, TripStatus} from '../types';
import {TRIP_STATUS_LABELS} from '../types';
import type {CreateTripInput} from '../validation';
import {TRIP_NATIVE_SELECT_CLASS} from '../utils/form-styles';

export interface TripFormModalProps {
  open: boolean;
  onClose: () => void;
  trip?: Trip | null;
  branches: BranchSelectOption[];
  drivers: DriverSelectOption[];
  vehicles: VehicleSelectOption[];
  customers: Customer[];
  contracts?: CustomerContract[];
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
  contracts: initialContracts = [],
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
        initialContracts={initialContracts}
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
  initialContracts,
  onClose,
  onSaved,
}: {
  trip?: Trip | null;
  isEdit: boolean;
  branches: BranchSelectOption[];
  drivers: DriverSelectOption[];
  vehicles: VehicleSelectOption[];
  customers: Customer[];
  initialContracts: CustomerContract[];
  onClose: () => void;
  onSaved: (trip: Trip) => void;
}) {
  const [contracts, setContracts] = React.useState<CustomerContract[]>(initialContracts);
  const [formData, setFormData] = React.useState<CreateTripInput>(() => ({
    branchId: trip?.branchId ?? null,
    driverId: trip?.driverId ?? null,
    vehicleId: trip?.vehicleId ?? null,
    clientName: trip?.clientName ?? null,
    contractReference: trip?.contractReference ?? null,
    customerId: trip?.customerId ?? null,
    customerContractId: trip?.customerContractId ?? null,
    freightTable: trip?.freightTable ?? null,
    contractedFreightValue: trip?.contractedFreightValue ?? null,
    actualFreightValue: trip?.actualFreightValue ?? null,
    freightMargin: trip?.freightMargin ?? null,
    origin: trip?.origin ?? null,
    destination: trip?.destination ?? null,
    route: trip?.route ?? null,
    initialOdometerKm: trip?.initialOdometerKm ?? null,
    finalOdometerKm: trip?.finalOdometerKm ?? null,
    initialHourMeter: trip?.initialHourMeter ?? null,
    finalHourMeter: trip?.finalHourMeter ?? null,
    departedAt: trip?.departedAt ?? null,
    arrivedAt: trip?.arrivedAt ?? null,
    weightKg: trip?.weightKg ?? null,
    volumeM3: trip?.volumeM3 ?? null,
    cargoType: trip?.cargoType ?? null,
    notes: trip?.notes ?? null,
    responsible: trip?.responsible ?? null,
    tripStatus: trip?.tripStatus ?? 'planned',
  }));
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const toast = useToast();
  const visibleContracts = formData.customerId ? contracts : [];

  React.useEffect(() => {
    if (!formData.customerId) return;

    let cancelled = false;
    (async () => {
      const {listActiveContractsForSelect} = await import('@/features/customers/queries');
      const {createClient} = await import('@/supabase/client');
      const supabase = createClient();
      const companyId = customers[0]?.companyId;
      if (!companyId) return;
      const rows = await listActiveContractsForSelect(supabase, companyId, formData.customerId!);
      if (!cancelled) setContracts(rows);
    })();
    return () => { cancelled = true; };
  }, [formData.customerId, customers]);

  async function handleCustomerChange(customerId: string | null) {
    const customer = customers.find((c) => c.id === customerId);
    setContracts([]);
    setFormData((prev) => ({
      ...prev,
      customerId,
      customerContractId: null,
      clientName: customer?.displayName ?? null,
      contractReference: null,
    }));
  }

  async function handleContractChange(contractId: string | null) {
    const contract = visibleContracts.find((c) => c.id === contractId);
    updateField('customerContractId', contractId);
    updateField('contractReference', contract?.contractNumber ?? null);
    updateField('freightTable', contract?.freightTable ?? null);

    if (!contractId) return;

    const result = await resolveContractFreightAction(
      contractId,
      formData.origin,
      formData.destination,
    );
    if (result.success && result.data) {
      const d = result.data;
      setFormData((prev) => ({
        ...prev,
        customerContractId: contractId,
        contractReference: contract?.contractNumber ?? null,
        freightTable: d.freightTable,
        origin: d.origin ?? prev.origin,
        destination: d.destination ?? prev.destination,
        contractedFreightValue: d.freightValue,
        notes: d.notes ?? prev.notes,
      }));
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

    const result = isEdit && trip
      ? await updateTripAction(trip.id, formData)
      : await createTripAction(formData);

    if (!result.success) {
      setFormError(result.error);
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors as FieldErrors);
      }
      setSubmitting(false);
      return;
    }

    onSaved(result.data);
    toast.success(isEdit ? 'Viagem atualizada com sucesso' : 'Viagem criada com sucesso');
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
        <FormField label="Status" htmlFor="trip-status" error={fieldErrors.tripStatus}>
          <select
            id="trip-status"
            value={formData.tripStatus ?? 'planned'}
            onChange={(e) =>
              updateField('tripStatus', e.target.value as TripStatus)
            }
            className={TRIP_NATIVE_SELECT_CLASS}
          >
            {TRIP_STATUSES.map((status) => (
              <option key={status} value={status}>
                {TRIP_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
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
        <FormField label="Contrato" htmlFor="trip-contract-select" error={fieldErrors.customerContractId}>
          <select
            id="trip-contract-select"
            value={formData.customerContractId ?? ''}
            onChange={(e) => handleContractChange(e.target.value || null)}
            className={TRIP_NATIVE_SELECT_CLASS}
            disabled={!formData.customerId}
          >
            <option value="">Selecione</option>
            {visibleContracts.map((contract) => (
              <option key={contract.id} value={contract.id}>
                {contract.contractNumber}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Nome do cliente (livre)" htmlFor="trip-client" error={fieldErrors.clientName}>
          <Input
            id="trip-client"
            value={formData.clientName ?? ''}
            onChange={(e) => updateField('clientName', e.target.value || null)}
          />
        </FormField>
        <FormField label="Ref. contrato" htmlFor="trip-contract" error={fieldErrors.contractReference}>
          <Input
            id="trip-contract"
            value={formData.contractReference ?? ''}
            onChange={(e) =>
              updateField('contractReference', e.target.value || null)
            }
          />
        </FormField>
        <FormField label="Tabela de frete" htmlFor="trip-freight-table" error={fieldErrors.freightTable}>
          <Input
            id="trip-freight-table"
            value={formData.freightTable ?? ''}
            onChange={(e) => updateField('freightTable', e.target.value || null)}
          />
        </FormField>
        <FormField label="Valor contratado" htmlFor="trip-contracted-value" error={fieldErrors.contractedFreightValue}>
          <Input
            id="trip-contracted-value"
            type="number"
            step="0.01"
            value={formData.contractedFreightValue ?? ''}
            onChange={(e) => updateField('contractedFreightValue', e.target.value ? Number(e.target.value) : null)}
          />
        </FormField>
        <FormField label="Origem" htmlFor="trip-origin" error={fieldErrors.origin}>
          <Input
            id="trip-origin"
            value={formData.origin ?? ''}
            onChange={(e) => updateField('origin', e.target.value || null)}
          />
        </FormField>
        <FormField label="Destino" htmlFor="trip-destination" error={fieldErrors.destination}>
          <Input
            id="trip-destination"
            value={formData.destination ?? ''}
            onChange={(e) => updateField('destination', e.target.value || null)}
          />
        </FormField>
        <FormField label="Rota" htmlFor="trip-route" error={fieldErrors.route} className="sm:col-span-2">
          <Input
            id="trip-route"
            value={formData.route ?? ''}
            onChange={(e) => updateField('route', e.target.value || null)}
          />
        </FormField>
        <FormField label="KM inicial" htmlFor="trip-km-initial" error={fieldErrors.initialOdometerKm}>
          <Input
            id="trip-km-initial"
            type="number"
            step="0.01"
            value={formData.initialOdometerKm ?? ''}
            onChange={(e) =>
              updateField('initialOdometerKm', e.target.value ? Number(e.target.value) : null)
            }
          />
        </FormField>
        <FormField label="KM final" htmlFor="trip-km-final" error={fieldErrors.finalOdometerKm}>
          <Input
            id="trip-km-final"
            type="number"
            step="0.01"
            value={formData.finalOdometerKm ?? ''}
            onChange={(e) =>
              updateField('finalOdometerKm', e.target.value ? Number(e.target.value) : null)
            }
          />
        </FormField>
        <FormField label="Horímetro inicial" htmlFor="trip-hour-initial" error={fieldErrors.initialHourMeter}>
          <Input
            id="trip-hour-initial"
            type="number"
            step="0.01"
            value={formData.initialHourMeter ?? ''}
            onChange={(e) =>
              updateField('initialHourMeter', e.target.value ? Number(e.target.value) : null)
            }
          />
        </FormField>
        <FormField label="Horímetro final" htmlFor="trip-hour-final" error={fieldErrors.finalHourMeter}>
          <Input
            id="trip-hour-final"
            type="number"
            step="0.01"
            value={formData.finalHourMeter ?? ''}
            onChange={(e) =>
              updateField('finalHourMeter', e.target.value ? Number(e.target.value) : null)
            }
          />
        </FormField>
        <FormField label="Saída" htmlFor="trip-departed" error={fieldErrors.departedAt}>
          <Input
            id="trip-departed"
            type="datetime-local"
            value={
              formData.departedAt
                ? formData.departedAt.slice(0, 16)
                : ''
            }
            onChange={(e) =>
              updateField(
                'departedAt',
                e.target.value ? new Date(e.target.value).toISOString() : null,
              )
            }
          />
        </FormField>
        <FormField label="Chegada" htmlFor="trip-arrived" error={fieldErrors.arrivedAt}>
          <Input
            id="trip-arrived"
            type="datetime-local"
            value={
              formData.arrivedAt ? formData.arrivedAt.slice(0, 16) : ''
            }
            onChange={(e) =>
              updateField(
                'arrivedAt',
                e.target.value ? new Date(e.target.value).toISOString() : null,
              )
            }
          />
        </FormField>
        <FormField label="Peso (kg)" htmlFor="trip-weight" error={fieldErrors.weightKg}>
          <Input
            id="trip-weight"
            type="number"
            step="0.01"
            value={formData.weightKg ?? ''}
            onChange={(e) => updateField('weightKg', e.target.value ? Number(e.target.value) : null)}
          />
        </FormField>
        <FormField label="Cubagem (m³)" htmlFor="trip-volume" error={fieldErrors.volumeM3}>
          <Input
            id="trip-volume"
            type="number"
            step="0.0001"
            value={formData.volumeM3 ?? ''}
            onChange={(e) => updateField('volumeM3', e.target.value ? Number(e.target.value) : null)}
          />
        </FormField>
        <FormField label="Tipo da carga" htmlFor="trip-cargo-type" error={fieldErrors.cargoType}>
          <Input
            id="trip-cargo-type"
            value={formData.cargoType ?? ''}
            onChange={(e) => updateField('cargoType', e.target.value || null)}
          />
        </FormField>
        <FormField label="Responsável" htmlFor="trip-responsible" error={fieldErrors.responsible}>
          <Input
            id="trip-responsible"
            value={formData.responsible ?? ''}
            onChange={(e) => updateField('responsible', e.target.value || null)}
          />
        </FormField>
        <FormField label="Observações" htmlFor="trip-notes" error={fieldErrors.notes} className="sm:col-span-2">
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
          Salvar
        </Button>
      </div>
    </form>
  );
}

export {TripFormModal};
