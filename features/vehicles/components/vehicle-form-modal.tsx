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
import {MSG} from '@/lib/feedback/messages';

import {createVehicleAction, updateVehicleAction} from '../actions';
import type {Vehicle, VehicleAssetStatus, VehicleBodyType, VehicleFuelType} from '../types';
import {
  VEHICLE_ASSET_STATUS_LABELS,
  VEHICLE_BODY_TYPE_OPTIONS,
  VEHICLE_FUEL_TYPE_LABELS,
  VEHICLE_TYPE_OPTIONS,
} from '../types';
import {VEHICLE_NATIVE_SELECT_CLASS} from '../utils/form-styles';
import {
  formatChassisInput,
  formatDecimalInput,
  formatIntegerInput,
  formatOdometerInput,
  formatPlateInput,
  formatRenavamInput,
  formatYearInput,
  toUpperTrimmed,
} from '../utils/vehicle-format';

export interface VehicleFormModalProps {
  open: boolean;
  onClose: () => void;
  vehicle?: Vehicle | null;
  branches: BranchSelectOption[];
  onSaved: (vehicle: Vehicle) => void;
}

type FormState = {
  plate: string;
  vehicleType: string;
  bodyType: VehicleBodyType | null;
  brand: string;
  model: string;
  year: string;
  renavam: string;
  chassis: string;
  color: string;
  fuelType: VehicleFuelType | null;
  loadCapacityKg: string;
  grossWeightKg: string;
  tareKg: string;
  axles: string;
  initialOdometerKm: string;
  assetStatus: VehicleAssetStatus;
  branchId: string | null;
  notes: string;
};

type FieldErrors = Partial<Record<keyof FormState | 'currentOdometerKm', string>>;

function buildInitialState(vehicle?: Vehicle | null): FormState {
  return {
    plate: formatPlateInput(vehicle?.plate),
    vehicleType: vehicle?.vehicleType ?? '',
    bodyType: vehicle?.bodyType ?? null,
    brand: vehicle?.brand ? toUpperTrimmed(vehicle.brand) : '',
    model: vehicle?.model ? toUpperTrimmed(vehicle.model) : '',
    year: vehicle?.year != null ? String(vehicle.year) : '',
    renavam: formatRenavamInput(vehicle?.renavam),
    chassis: formatChassisInput(vehicle?.chassis),
    color: vehicle?.color ? toUpperTrimmed(vehicle.color) : '',
    fuelType: vehicle?.fuelType ?? null,
    loadCapacityKg:
      vehicle?.loadCapacityKg != null ? String(vehicle.loadCapacityKg) : '',
    grossWeightKg:
      vehicle?.grossWeightKg != null ? String(vehicle.grossWeightKg) : '',
    tareKg: vehicle?.tareKg != null ? String(vehicle.tareKg) : '',
    axles: vehicle?.axles != null ? String(vehicle.axles) : '',
    initialOdometerKm: String(vehicle?.initialOdometerKm ?? 0),
    assetStatus: vehicle?.assetStatus ?? 'active',
    branchId: vehicle?.branchId ?? null,
    notes: vehicle?.notes ? toUpperTrimmed(vehicle.notes) : '',
  };
}

function VehicleFormModal({
  open,
  onClose,
  vehicle,
  branches,
  onSaved,
}: VehicleFormModalProps) {
  const isEdit = Boolean(vehicle);
  const formKey = `${open}-${vehicle?.id ?? 'new'}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar veículo' : 'Novo veículo'}
      description={
        isEdit ? 'Atualize os dados do veículo' : 'Cadastre um novo veículo na frota'
      }
      size="xl"
    >
      <VehicleFormContent
        key={formKey}
        vehicle={vehicle}
        isEdit={isEdit}
        branches={branches}
        onClose={onClose}
        onSaved={onSaved}
      />
    </Modal>
  );
}

function VehicleFormContent({
  vehicle,
  isEdit,
  branches,
  onClose,
  onSaved,
}: {
  vehicle?: Vehicle | null;
  isEdit: boolean;
  branches: BranchSelectOption[];
  onClose: () => void;
  onSaved: (vehicle: Vehicle) => void;
}) {
  const [formData, setFormData] = React.useState<FormState>(() =>
    buildInitialState(vehicle),
  );
  const [currentOdometerKm, setCurrentOdometerKm] = React.useState(
    String(vehicle?.currentOdometerKm ?? 0),
  );
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const toast = useToast();

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
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

    const payload = {
      plate: formData.plate,
      vehicleType: formData.vehicleType,
      bodyType: formData.bodyType,
      brand: formData.brand || null,
      model: formData.model || null,
      year: formData.year || null,
      renavam: formData.renavam || null,
      chassis: formData.chassis || null,
      color: formData.color || null,
      fuelType: formData.fuelType,
      loadCapacityKg: formData.loadCapacityKg || null,
      grossWeightKg: formData.grossWeightKg || null,
      tareKg: formData.tareKg || null,
      axles: formData.axles || null,
      initialOdometerKm: formData.initialOdometerKm || 0,
      assetStatus: formData.assetStatus,
      branchId: formData.branchId,
      notes: formData.notes || null,
      ...(isEdit ? {currentOdometerKm: currentOdometerKm || 0} : {}),
    };

    const result =
      isEdit && vehicle
        ? await updateVehicleAction(vehicle.id, payload)
        : await createVehicleAction(payload);

    if (!result.success) {
      setFormError(result.error);
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors as FieldErrors);
      }
      setSubmitting(false);
      return;
    }

    onSaved(result.data);
    toast.success(isEdit ? MSG.updated('Veículo') : MSG.created('Veículo'));
    setSubmitting(false);
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <FormField label="Placa" htmlFor="plate" required error={fieldErrors.plate}>
          <Input
            id="plate"
            value={formData.plate}
            onChange={(e) => updateField('plate', formatPlateInput(e.target.value))}
            placeholder="ABC-1D45"
            maxLength={8}
            autoComplete="off"
            className="uppercase"
          />
        </FormField>
        <FormField label="Tipo" htmlFor="vehicleType" required error={fieldErrors.vehicleType}>
          <select
            id="vehicleType"
            value={formData.vehicleType}
            onChange={(e) => updateField('vehicleType', e.target.value)}
            className={VEHICLE_NATIVE_SELECT_CLASS}
          >
            <option value="">Selecione</option>
            {VEHICLE_TYPE_OPTIONS.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Situação" htmlFor="assetStatus" required>
          <select
            id="assetStatus"
            value={formData.assetStatus}
            onChange={(e) =>
              updateField('assetStatus', e.target.value as VehicleAssetStatus)
            }
            className={VEHICLE_NATIVE_SELECT_CLASS}
          >
            {(Object.keys(VEHICLE_ASSET_STATUS_LABELS) as VehicleAssetStatus[]).map((status) => (
              <option key={status} value={status}>
                {VEHICLE_ASSET_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Marca" htmlFor="brand" error={fieldErrors.brand}>
          <Input
            id="brand"
            value={formData.brand}
            onChange={(e) => updateField('brand', toUpperTrimmed(e.target.value))}
            className="uppercase"
            autoComplete="off"
          />
        </FormField>
        <FormField
          label="Implemento / Carroceria"
          htmlFor="bodyType"
          error={fieldErrors.bodyType}
          hint="Opcional"
        >
          <select
            id="bodyType"
            value={formData.bodyType ?? ''}
            onChange={(e) =>
              updateField('bodyType', (e.target.value || null) as VehicleBodyType | null)
            }
            className={VEHICLE_NATIVE_SELECT_CLASS}
          >
            <option value="">Selecione</option>
            {VEHICLE_BODY_TYPE_OPTIONS.map((bodyType) => (
              <option key={bodyType} value={bodyType}>
                {bodyType}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Modelo" htmlFor="model" error={fieldErrors.model}>
          <Input
            id="model"
            value={formData.model}
            onChange={(e) => updateField('model', toUpperTrimmed(e.target.value))}
            className="uppercase"
            autoComplete="off"
          />
        </FormField>
        <FormField label="Ano" htmlFor="year" error={fieldErrors.year}>
          <Input
            id="year"
            inputMode="numeric"
            value={formData.year}
            onChange={(e) => updateField('year', formatYearInput(e.target.value))}
            placeholder="2024"
            maxLength={4}
            autoComplete="off"
          />
        </FormField>
        <FormField label="Renavam" htmlFor="renavam" error={fieldErrors.renavam}>
          <Input
            id="renavam"
            inputMode="numeric"
            value={formData.renavam}
            onChange={(e) => updateField('renavam', formatRenavamInput(e.target.value))}
            placeholder="00000000000"
            maxLength={11}
            autoComplete="off"
          />
        </FormField>
        <FormField label="Chassi" htmlFor="chassis" error={fieldErrors.chassis}>
          <Input
            id="chassis"
            value={formData.chassis}
            onChange={(e) => updateField('chassis', formatChassisInput(e.target.value))}
            className="uppercase"
            maxLength={17}
            autoComplete="off"
          />
        </FormField>
        <FormField label="Cor" htmlFor="color" error={fieldErrors.color}>
          <Input
            id="color"
            value={formData.color}
            onChange={(e) => updateField('color', toUpperTrimmed(e.target.value))}
            className="uppercase"
            autoComplete="off"
          />
        </FormField>
        <FormField label="Combustível" htmlFor="fuelType" error={fieldErrors.fuelType}>
          <select
            id="fuelType"
            value={formData.fuelType ?? ''}
            onChange={(e) =>
              updateField('fuelType', (e.target.value || null) as VehicleFuelType | null)
            }
            className={VEHICLE_NATIVE_SELECT_CLASS}
          >
            <option value="">Selecione</option>
            {(Object.keys(VEHICLE_FUEL_TYPE_LABELS) as VehicleFuelType[]).map((fuel) => (
              <option key={fuel} value={fuel}>
                {VEHICLE_FUEL_TYPE_LABELS[fuel]}
              </option>
            ))}
          </select>
        </FormField>
        <FormField
          label="Capacidade de carga (kg)"
          htmlFor="loadCapacityKg"
          error={fieldErrors.loadCapacityKg}
        >
          <Input
            id="loadCapacityKg"
            inputMode="decimal"
            value={formData.loadCapacityKg}
            onChange={(e) =>
              updateField('loadCapacityKg', formatDecimalInput(e.target.value))
            }
            autoComplete="off"
          />
        </FormField>
        <FormField
          label="Peso bruto (kg)"
          htmlFor="grossWeightKg"
          error={fieldErrors.grossWeightKg}
        >
          <Input
            id="grossWeightKg"
            inputMode="decimal"
            value={formData.grossWeightKg}
            onChange={(e) =>
              updateField('grossWeightKg', formatDecimalInput(e.target.value))
            }
            autoComplete="off"
          />
        </FormField>
        <FormField label="Tara (kg)" htmlFor="tareKg" error={fieldErrors.tareKg}>
          <Input
            id="tareKg"
            inputMode="decimal"
            value={formData.tareKg}
            onChange={(e) => updateField('tareKg', formatDecimalInput(e.target.value))}
            autoComplete="off"
          />
        </FormField>
        <FormField label="Nº de eixos" htmlFor="axles" error={fieldErrors.axles}>
          <Input
            id="axles"
            inputMode="numeric"
            value={formData.axles}
            onChange={(e) => updateField('axles', formatIntegerInput(e.target.value))}
            autoComplete="off"
          />
        </FormField>
        <FormField
          label="Hodômetro inicial (km)"
          htmlFor="initialOdometerKm"
          error={fieldErrors.initialOdometerKm}
        >
          <Input
            id="initialOdometerKm"
            inputMode="numeric"
            disabled={isEdit}
            value={formData.initialOdometerKm}
            onChange={(e) =>
              updateField('initialOdometerKm', formatOdometerInput(e.target.value))
            }
            autoComplete="off"
          />
        </FormField>
        {isEdit && (
          <FormField
            label="Hodômetro atual (km)"
            htmlFor="currentOdometerKm"
            error={fieldErrors.currentOdometerKm}
          >
            <Input
              id="currentOdometerKm"
              inputMode="numeric"
              value={currentOdometerKm}
              onChange={(e) => setCurrentOdometerKm(formatOdometerInput(e.target.value))}
              autoComplete="off"
            />
          </FormField>
        )}
        <FormField label="Filial" htmlFor="branchId">
          <select
            id="branchId"
            value={formData.branchId ?? ''}
            onChange={(e) => updateField('branchId', e.target.value || null)}
            className={VEHICLE_NATIVE_SELECT_CLASS}
          >
            <option value="">Nenhuma</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField label="Observações" htmlFor="notes" hint="Opcional" error={fieldErrors.notes}>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => updateField('notes', toUpperTrimmed(e.target.value))}
          rows={3}
          className="uppercase"
        />
      </FormField>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {isEdit ? 'Salvar' : 'Cadastrar'}
        </Button>
      </div>
    </form>
  );
}

export {VehicleFormModal};
