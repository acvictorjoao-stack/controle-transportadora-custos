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

import {createVehicleAction, updateVehicleAction} from '../actions';
import type {Vehicle, VehicleAssetStatus, VehicleFuelType} from '../types';
import {
  VEHICLE_ASSET_STATUS_LABELS,
  VEHICLE_FUEL_TYPE_LABELS,
  VEHICLE_TYPE_OPTIONS,
} from '../types';
import type {CreateVehicleInput, UpdateVehicleInput} from '../validation';
import {VEHICLE_NATIVE_SELECT_CLASS} from '../utils/form-styles';

export interface VehicleFormModalProps {
  open: boolean;
  onClose: () => void;
  vehicle?: Vehicle | null;
  branches: BranchSelectOption[];
  onSaved: (vehicle: Vehicle) => void;
}

type FieldErrors = Partial<Record<keyof CreateVehicleInput, string>>;

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
  const [formData, setFormData] = React.useState<CreateVehicleInput>(() => ({
    plate: vehicle?.plate ?? '',
    fleetNumber: vehicle?.fleetNumber ?? null,
    vehicleType: vehicle?.vehicleType ?? '',
    brand: vehicle?.brand ?? null,
    model: vehicle?.model ?? null,
    year: vehicle?.year ?? null,
    renavam: vehicle?.renavam ?? null,
    chassis: vehicle?.chassis ?? null,
    color: vehicle?.color ?? null,
    fuelType: vehicle?.fuelType ?? null,
    loadCapacityKg: vehicle?.loadCapacityKg ?? null,
    grossWeightKg: vehicle?.grossWeightKg ?? null,
    tareKg: vehicle?.tareKg ?? null,
    axles: vehicle?.axles ?? null,
    initialOdometerKm: vehicle?.initialOdometerKm ?? 0,
    hourMeter: vehicle?.hourMeter ?? null,
    assetStatus: vehicle?.assetStatus ?? 'active',
    branchId: vehicle?.branchId ?? null,
    notes: vehicle?.notes ?? null,
  }));
  const [currentOdometerKm, setCurrentOdometerKm] = React.useState(
    vehicle?.currentOdometerKm ?? 0,
  );
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const toast = useToast();

  function updateField<K extends keyof CreateVehicleInput>(
    field: K,
    value: CreateVehicleInput[K],
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

    const payload = isEdit
      ? ({...formData, currentOdometerKm} as UpdateVehicleInput)
      : formData;

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
    toast.success(isEdit ? 'Veículo atualizado com sucesso' : 'Veículo criado com sucesso');
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
            onChange={(e) => updateField('plate', e.target.value)}
            placeholder="ABC1D23"
          />
        </FormField>
        <FormField label="Frota" htmlFor="fleetNumber" error={fieldErrors.fleetNumber}>
          <Input
            id="fleetNumber"
            value={formData.fleetNumber ?? ''}
            onChange={(e) => updateField('fleetNumber', e.target.value || null)}
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
        <FormField label="Marca" htmlFor="brand" error={fieldErrors.brand}>
          <Input
            id="brand"
            value={formData.brand ?? ''}
            onChange={(e) => updateField('brand', e.target.value || null)}
          />
        </FormField>
        <FormField label="Modelo" htmlFor="model" error={fieldErrors.model}>
          <Input
            id="model"
            value={formData.model ?? ''}
            onChange={(e) => updateField('model', e.target.value || null)}
          />
        </FormField>
        <FormField label="Ano" htmlFor="year" error={fieldErrors.year}>
          <Input
            id="year"
            type="number"
            value={formData.year ?? ''}
            onChange={(e) => updateField('year', e.target.value ? Number(e.target.value) : null)}
          />
        </FormField>
        <FormField label="Renavam" htmlFor="renavam" error={fieldErrors.renavam}>
          <Input
            id="renavam"
            value={formData.renavam ?? ''}
            onChange={(e) => updateField('renavam', e.target.value || null)}
          />
        </FormField>
        <FormField label="Chassi" htmlFor="chassis" error={fieldErrors.chassis}>
          <Input
            id="chassis"
            value={formData.chassis ?? ''}
            onChange={(e) => updateField('chassis', e.target.value || null)}
          />
        </FormField>
        <FormField label="Cor" htmlFor="color" error={fieldErrors.color}>
          <Input
            id="color"
            value={formData.color ?? ''}
            onChange={(e) => updateField('color', e.target.value || null)}
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
        <FormField label="Capacidade de carga (kg)" htmlFor="loadCapacityKg">
          <Input
            id="loadCapacityKg"
            type="number"
            value={formData.loadCapacityKg ?? ''}
            onChange={(e) =>
              updateField('loadCapacityKg', e.target.value ? Number(e.target.value) : null)
            }
          />
        </FormField>
        <FormField label="Peso bruto (kg)" htmlFor="grossWeightKg">
          <Input
            id="grossWeightKg"
            type="number"
            value={formData.grossWeightKg ?? ''}
            onChange={(e) =>
              updateField('grossWeightKg', e.target.value ? Number(e.target.value) : null)
            }
          />
        </FormField>
        <FormField label="Tara (kg)" htmlFor="tareKg">
          <Input
            id="tareKg"
            type="number"
            value={formData.tareKg ?? ''}
            onChange={(e) => updateField('tareKg', e.target.value ? Number(e.target.value) : null)}
          />
        </FormField>
        <FormField label="Nº de eixos" htmlFor="axles">
          <Input
            id="axles"
            type="number"
            value={formData.axles ?? ''}
            onChange={(e) => updateField('axles', e.target.value ? Number(e.target.value) : null)}
          />
        </FormField>
        <FormField label="Hodômetro inicial (km)" htmlFor="initialOdometerKm">
          <Input
            id="initialOdometerKm"
            type="number"
            disabled={isEdit}
            value={formData.initialOdometerKm ?? 0}
            onChange={(e) => updateField('initialOdometerKm', Number(e.target.value))}
          />
        </FormField>
        {isEdit && (
          <FormField label="Hodômetro atual (km)" htmlFor="currentOdometerKm">
            <Input
              id="currentOdometerKm"
              type="number"
              value={currentOdometerKm}
              onChange={(e) => setCurrentOdometerKm(Number(e.target.value))}
            />
          </FormField>
        )}
        <FormField label="Horímetro (h)" htmlFor="hourMeter">
          <Input
            id="hourMeter"
            type="number"
            value={formData.hourMeter ?? ''}
            onChange={(e) =>
              updateField('hourMeter', e.target.value ? Number(e.target.value) : null)
            }
          />
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

      <FormField label="Observações" htmlFor="notes">
        <Textarea
          id="notes"
          value={formData.notes ?? ''}
          onChange={(e) => updateField('notes', e.target.value || null)}
          rows={3}
        />
      </FormField>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
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

export {VehicleFormModal};
