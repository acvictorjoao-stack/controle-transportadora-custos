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
import type {DriverSelectOption} from '@/features/drivers/types';
import type {VehicleSelectOption} from '@/features/vehicles/types';

import {createFuelRecordAction, updateFuelRecordAction} from '../actions';
import {FUEL_TYPES} from '../constants/enums';
import type {FuelRecord, FuelType} from '../types';
import {FUEL_TYPE_LABELS} from '../types';
import type {CreateFuelRecordInput} from '../validation';
import {FUEL_NATIVE_SELECT_CLASS} from '../utils/form-styles';

export interface FuelFormModalProps {
  open: boolean;
  onClose: () => void;
  record?: FuelRecord | null;
  branches: BranchSelectOption[];
  drivers: DriverSelectOption[];
  vehicles: VehicleSelectOption[];
  onSaved: (record: FuelRecord) => void;
}

type FieldErrors = Partial<Record<keyof CreateFuelRecordInput, string>>;

function toLocalDateTimeValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function FuelFormModal({
  open,
  onClose,
  record,
  branches,
  drivers,
  vehicles,
  onSaved,
}: FuelFormModalProps) {
  const isEdit = Boolean(record);
  const formKey = `${open}-${record?.id ?? 'new'}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar abastecimento' : 'Novo abastecimento'}
      description={
        isEdit ? 'Atualize os dados do abastecimento' : 'Registre um novo abastecimento da frota'
      }
      size="xl"
    >
      <FuelFormContent
        key={formKey}
        record={record}
        isEdit={isEdit}
        branches={branches}
        drivers={drivers}
        vehicles={vehicles}
        onClose={onClose}
        onSaved={onSaved}
      />
    </Modal>
  );
}

function FuelFormContent({
  record,
  isEdit,
  branches,
  drivers,
  vehicles,
  onClose,
  onSaved,
}: {
  record?: FuelRecord | null;
  isEdit: boolean;
  branches: BranchSelectOption[];
  drivers: DriverSelectOption[];
  vehicles: VehicleSelectOption[];
  onClose: () => void;
  onSaved: (record: FuelRecord) => void;
}) {
  const [formData, setFormData] = React.useState<CreateFuelRecordInput>(() => ({
    vehicleId: record?.vehicleId ?? vehicles[0]?.id ?? '',
    driverId: record?.driverId ?? drivers[0]?.id ?? '',
    branchId: record?.branchId ?? null,
    stationName: record?.stationName ?? null,
    stationBrand: record?.stationBrand ?? null,
    city: record?.city ?? null,
    state: record?.state ?? null,
    fueledAt: record?.fueledAt
      ? toLocalDateTimeValue(record.fueledAt)
      : toLocalDateTimeValue(new Date().toISOString()),
    fuelType: record?.fuelType ?? 'diesel',
    quantityLiters: record?.quantityLiters ?? 0,
    pricePerLiter: record?.pricePerLiter ?? 0,
    totalAmount: record?.totalAmount ?? 0,
    odometerKm: record?.odometerKm ?? null,
    notes: record?.notes ?? null,
    responsible: record?.responsible ?? null,
  }));
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const toast = useToast();

  function updateField<K extends keyof CreateFuelRecordInput>(
    field: K,
    value: CreateFuelRecordInput[K],
  ) {
    setFormData((prev) => {
      const next = {...prev, [field]: value};
      if (
        (field === 'quantityLiters' || field === 'pricePerLiter') &&
        typeof next.quantityLiters === 'number' &&
        typeof next.pricePerLiter === 'number'
      ) {
        next.totalAmount = Number((next.quantityLiters * next.pricePerLiter).toFixed(2));
      }
      return next;
    });
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

    const payload = {
      ...formData,
      fueledAt: new Date(formData.fueledAt).toISOString(),
    };

    const result = isEdit && record
      ? await updateFuelRecordAction(record.id, payload)
      : await createFuelRecordAction(payload);

    if (!result.success) {
      setFormError(result.error);
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors as FieldErrors);
      }
      setSubmitting(false);
      return;
    }

    onSaved(result.data);
    toast.success(isEdit ? 'Abastecimento atualizado com sucesso' : 'Abastecimento criado com sucesso');
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
        <FormField label="Veículo" htmlFor="fuel-vehicle" error={fieldErrors.vehicleId}>
          <select
            id="fuel-vehicle"
            value={formData.vehicleId}
            onChange={(e) => updateField('vehicleId', e.target.value)}
            className={FUEL_NATIVE_SELECT_CLASS}
            required
          >
            <option value="">Selecione</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.plate} {vehicle.model ? `— ${vehicle.model}` : ''}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Motorista" htmlFor="fuel-driver" error={fieldErrors.driverId}>
          <select
            id="fuel-driver"
            value={formData.driverId}
            onChange={(e) => updateField('driverId', e.target.value)}
            className={FUEL_NATIVE_SELECT_CLASS}
            required
          >
            <option value="">Selecione</option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Filial" htmlFor="fuel-branch" error={fieldErrors.branchId}>
          <select
            id="fuel-branch"
            value={formData.branchId ?? ''}
            onChange={(e) => updateField('branchId', e.target.value || null)}
            className={FUEL_NATIVE_SELECT_CLASS}
          >
            <option value="">Sem filial</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Data e hora" htmlFor="fuel-date" error={fieldErrors.fueledAt}>
          <Input
            id="fuel-date"
            type="datetime-local"
            value={formData.fueledAt}
            onChange={(e) => updateField('fueledAt', e.target.value)}
            required
          />
        </FormField>
        <FormField label="Combustível" htmlFor="fuel-type" error={fieldErrors.fuelType}>
          <select
            id="fuel-type"
            value={formData.fuelType}
            onChange={(e) => updateField('fuelType', e.target.value as FuelType)}
            className={FUEL_NATIVE_SELECT_CLASS}
          >
            {FUEL_TYPES.map((type) => (
              <option key={type} value={type}>
                {FUEL_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Posto" htmlFor="fuel-station" error={fieldErrors.stationName}>
          <Input
            id="fuel-station"
            value={formData.stationName ?? ''}
            onChange={(e) => updateField('stationName', e.target.value || null)}
          />
        </FormField>
        <FormField label="Bandeira" htmlFor="fuel-brand" error={fieldErrors.stationBrand}>
          <Input
            id="fuel-brand"
            value={formData.stationBrand ?? ''}
            onChange={(e) => updateField('stationBrand', e.target.value || null)}
          />
        </FormField>
        <FormField label="Cidade" htmlFor="fuel-city" error={fieldErrors.city}>
          <Input
            id="fuel-city"
            value={formData.city ?? ''}
            onChange={(e) => updateField('city', e.target.value || null)}
          />
        </FormField>
        <FormField label="Estado" htmlFor="fuel-state" error={fieldErrors.state}>
          <Input
            id="fuel-state"
            value={formData.state ?? ''}
            onChange={(e) => updateField('state', e.target.value || null)}
            maxLength={2}
          />
        </FormField>
        <FormField label="Litros" htmlFor="fuel-liters" error={fieldErrors.quantityLiters}>
          <Input
            id="fuel-liters"
            type="number"
            step="0.001"
            min="0"
            value={formData.quantityLiters || ''}
            onChange={(e) => updateField('quantityLiters', Number(e.target.value))}
            required
          />
        </FormField>
        <FormField label="Valor por litro" htmlFor="fuel-price" error={fieldErrors.pricePerLiter}>
          <Input
            id="fuel-price"
            type="number"
            step="0.0001"
            min="0"
            value={formData.pricePerLiter ?? ''}
            onChange={(e) => updateField('pricePerLiter', Number(e.target.value))}
            required
          />
        </FormField>
        <FormField label="Valor total" htmlFor="fuel-total" error={fieldErrors.totalAmount}>
          <Input
            id="fuel-total"
            type="number"
            step="0.01"
            min="0"
            value={formData.totalAmount ?? ''}
            onChange={(e) => updateField('totalAmount', Number(e.target.value))}
            required
          />
        </FormField>
        <FormField label="Odômetro (km)" htmlFor="fuel-odometer" error={fieldErrors.odometerKm}>
          <Input
            id="fuel-odometer"
            type="number"
            step="0.01"
            min="0"
            value={formData.odometerKm ?? ''}
            onChange={(e) =>
              updateField('odometerKm', e.target.value ? Number(e.target.value) : null)
            }
          />
        </FormField>
        <FormField label="Responsável" htmlFor="fuel-responsible" error={fieldErrors.responsible}>
          <Input
            id="fuel-responsible"
            value={formData.responsible ?? ''}
            onChange={(e) => updateField('responsible', e.target.value || null)}
          />
        </FormField>
      </div>

      <FormField label="Observações" htmlFor="fuel-notes" error={fieldErrors.notes}>
        <Textarea
          id="fuel-notes"
          value={formData.notes ?? ''}
          onChange={(e) => updateField('notes', e.target.value || null)}
          rows={3}
        />
      </FormField>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Salvar
        </Button>
      </div>
    </form>
  );
}

export {FuelFormModal};
