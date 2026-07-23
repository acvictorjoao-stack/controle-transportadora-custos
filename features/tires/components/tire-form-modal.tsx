'use client';

import {Loader2, Save} from 'lucide-react';
import * as React from 'react';

import {Modal} from '@/components/master/shared/modal';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {useToast} from '@/contexts/feedback/toast-context';
import {
  OPERATION_PAYMENT_TYPE_LABELS,
  OPERATION_PAYMENT_TYPES,
} from '@/features/financial/constants/operation-financial';
import type {BranchSelectOption} from '@/features/organization/branches/types';
import type {VehicleSelectOption} from '@/features/vehicles/types';

import {createTireAction, updateTireAction} from '../actions';
import {TIRE_POSITIONS, TIRE_STATUSES} from '../constants/enums';
import type {Tire, TirePosition, TireStatus} from '../types';
import {TIRE_POSITION_LABELS, TIRE_STATUS_LABELS} from '../types';
import type {CreateTireInput} from '../validation';
import {TIRE_NATIVE_SELECT_CLASS} from '../utils/form-styles';

export interface TireFormModalProps {
  open: boolean;
  onClose: () => void;
  tire?: Tire | null;
  branches: BranchSelectOption[];
  vehicles: VehicleSelectOption[];
  onSaved: (tire: Tire) => void;
}

type FieldErrors = Partial<Record<keyof CreateTireInput, string>>;

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function TireFormModal({open, onClose, tire, branches, vehicles, onSaved}: TireFormModalProps) {
  const isEdit = Boolean(tire);
  const formKey = `${open}-${tire?.id ?? 'new'}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar pneu' : 'Novo pneu'}
      description={isEdit ? 'Atualize os dados do pneu' : 'Cadastre um novo pneu na frota'}
      size="xl"
    >
      <TireFormContent
        key={formKey}
        tire={tire}
        isEdit={isEdit}
        branches={branches}
        vehicles={vehicles}
        onClose={onClose}
        onSaved={onSaved}
      />
    </Modal>
  );
}

function TireFormContent({
  tire,
  isEdit,
  branches,
  vehicles,
  onClose,
  onSaved,
}: {
  tire?: Tire | null;
  isEdit: boolean;
  branches: BranchSelectOption[];
  vehicles: VehicleSelectOption[];
  onClose: () => void;
  onSaved: (tire: Tire) => void;
}) {
  const [formData, setFormData] = React.useState<CreateTireInput>(() => ({
    branchId: tire?.branchId ?? null,
    vehicleId: tire?.vehicleId ?? null,
    maintenanceRecordId: tire?.maintenanceRecordId ?? null,
    assetNumber: tire?.assetNumber ?? null,
    internalCode: tire?.internalCode ?? null,
    brand: tire?.brand ?? null,
    model: tire?.model ?? null,
    tireSize: tire?.tireSize ?? null,
    manufacturer: tire?.manufacturer ?? null,
    dotNumber: tire?.dotNumber ?? null,
    fireNumber: tire?.fireNumber ?? null,
    serialNumber: tire?.serialNumber ?? null,
    expectedLifeKm: tire?.expectedLifeKm ?? null,
    currentKm: tire?.currentKm ?? 0,
    accumulatedKm: tire?.accumulatedKm ?? 0,
    purchaseDate: tire?.purchaseDate ?? null,
    purchaseValue: tire?.purchaseValue ?? null,
    supplier: tire?.supplier ?? null,
    warranty: tire?.warranty ?? null,
    tireStatus: tire?.tireStatus ?? 'in_stock',
    currentPosition: tire?.currentPosition ?? null,
    notes: tire?.notes ?? null,
    paymentType: tire?.paymentType ?? 'cash',
    paymentDueDate: tire?.paymentDueDate ?? null,
  }));
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const toast = useToast();

  function updateField<K extends keyof CreateTireInput>(key: K, value: CreateTireInput[K]) {
    setFormData((prev) => ({...prev, [key]: value}));
    setFieldErrors((prev) => ({...prev, [key]: undefined}));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    const result = isEdit
      ? await updateTireAction(tire!.id, formData)
      : await createTireAction(formData);

    setLoading(false);

    if (!result.success) {
      setError(result.error);
      if (result.fieldErrors) setFieldErrors(result.fieldErrors as FieldErrors);
      return;
    }

    onSaved(result.data);
    toast.success(isEdit ? 'Pneu atualizado com sucesso' : 'Pneu criado com sucesso');
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nº patrimônio" error={fieldErrors.assetNumber}>
          <Input
            value={formData.assetNumber ?? ''}
            onChange={(e) => updateField('assetNumber', e.target.value || null)}
          />
        </Field>
        <Field label="Código interno" error={fieldErrors.internalCode}>
          <Input
            value={formData.internalCode ?? ''}
            onChange={(e) => updateField('internalCode', e.target.value || null)}
          />
        </Field>
        <Field label="Marca" error={fieldErrors.brand}>
          <Input
            value={formData.brand ?? ''}
            onChange={(e) => updateField('brand', e.target.value || null)}
          />
        </Field>
        <Field label="Modelo" error={fieldErrors.model}>
          <Input
            value={formData.model ?? ''}
            onChange={(e) => updateField('model', e.target.value || null)}
          />
        </Field>
        <Field label="Medida" error={fieldErrors.tireSize}>
          <Input
            value={formData.tireSize ?? ''}
            onChange={(e) => updateField('tireSize', e.target.value || null)}
            placeholder="295/80R22.5"
          />
        </Field>
        <Field label="Fabricante" error={fieldErrors.manufacturer}>
          <Input
            value={formData.manufacturer ?? ''}
            onChange={(e) => updateField('manufacturer', e.target.value || null)}
          />
        </Field>
        <Field label="DOT" error={fieldErrors.dotNumber}>
          <Input
            value={formData.dotNumber ?? ''}
            onChange={(e) => updateField('dotNumber', e.target.value || null)}
          />
        </Field>
        <Field label="Nº de fogo" error={fieldErrors.fireNumber}>
          <Input
            value={formData.fireNumber ?? ''}
            onChange={(e) => updateField('fireNumber', e.target.value || null)}
          />
        </Field>
        <Field label="Nº de série" error={fieldErrors.serialNumber}>
          <Input
            value={formData.serialNumber ?? ''}
            onChange={(e) => updateField('serialNumber', e.target.value || null)}
          />
        </Field>
        <Field label="Vida útil prevista (km)" error={fieldErrors.expectedLifeKm}>
          <Input
            type="number"
            value={formData.expectedLifeKm ?? ''}
            onChange={(e) => updateField('expectedLifeKm', e.target.value ? Number(e.target.value) : null)}
          />
        </Field>
        <Field label="KM atual" error={fieldErrors.currentKm}>
          <Input
            type="number"
            value={formData.currentKm ?? 0}
            onChange={(e) => updateField('currentKm', e.target.value ? Number(e.target.value) : 0)}
          />
        </Field>
        <Field label="KM acumulado" error={fieldErrors.accumulatedKm}>
          <Input
            type="number"
            value={formData.accumulatedKm ?? 0}
            onChange={(e) => updateField('accumulatedKm', e.target.value ? Number(e.target.value) : 0)}
          />
        </Field>
        <Field label="Data de compra" error={fieldErrors.purchaseDate}>
          <Input
            type="date"
            value={formData.purchaseDate ?? ''}
            onChange={(e) => updateField('purchaseDate', e.target.value || null)}
          />
        </Field>
        <Field label="Valor de compra" error={fieldErrors.purchaseValue}>
          <Input
            type="number"
            step="0.01"
            value={formData.purchaseValue ?? ''}
            onChange={(e) => updateField('purchaseValue', e.target.value ? Number(e.target.value) : null)}
          />
        </Field>
        <Field label="Forma de pagamento" error={fieldErrors.paymentType}>
          <select
            value={formData.paymentType}
            onChange={(e) => {
              const value = e.target.value as (typeof OPERATION_PAYMENT_TYPES)[number];
              updateField('paymentType', value);
              if (value === 'cash') updateField('paymentDueDate', null);
            }}
            className={TIRE_NATIVE_SELECT_CLASS}
          >
            {OPERATION_PAYMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {OPERATION_PAYMENT_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </Field>
        {formData.paymentType === 'credit' && (
          <Field label="Vencimento" error={fieldErrors.paymentDueDate}>
            <Input
              type="date"
              value={formData.paymentDueDate ?? ''}
              onChange={(e) => updateField('paymentDueDate', e.target.value || null)}
              required
            />
          </Field>
        )}
        <Field label="Fornecedor" error={fieldErrors.supplier}>
          <Input
            value={formData.supplier ?? ''}
            onChange={(e) => updateField('supplier', e.target.value || null)}
          />
        </Field>
        <Field label="Garantia" error={fieldErrors.warranty}>
          <Input
            value={formData.warranty ?? ''}
            onChange={(e) => updateField('warranty', e.target.value || null)}
          />
        </Field>
        <Field label="Status" error={fieldErrors.tireStatus}>
          <select
            value={formData.tireStatus}
            onChange={(e) => updateField('tireStatus', e.target.value as TireStatus)}
            className={TIRE_NATIVE_SELECT_CLASS}
          >
            {TIRE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {TIRE_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Filial" error={fieldErrors.branchId}>
          <select
            value={formData.branchId ?? ''}
            onChange={(e) => updateField('branchId', e.target.value || null)}
            className={TIRE_NATIVE_SELECT_CLASS}
          >
            <option value="">Nenhuma</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Veículo" error={fieldErrors.vehicleId}>
          <select
            value={formData.vehicleId ?? ''}
            onChange={(e) => updateField('vehicleId', e.target.value || null)}
            className={TIRE_NATIVE_SELECT_CLASS}
          >
            <option value="">Nenhum</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.plate}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Posição" error={fieldErrors.currentPosition}>
          <select
            value={formData.currentPosition ?? ''}
            onChange={(e) => updateField('currentPosition', (e.target.value || null) as TirePosition | null)}
            className={TIRE_NATIVE_SELECT_CLASS}
          >
            <option value="">Nenhuma</option>
            {TIRE_POSITIONS.map((position) => (
              <option key={position} value={position}>
                {TIRE_POSITION_LABELS[position]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Observações" error={fieldErrors.notes}>
        <Textarea
          value={formData.notes ?? ''}
          onChange={(e) => updateField('notes', e.target.value || null)}
          rows={3}
        />
      </Field>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Salvar
        </Button>
      </div>
    </form>
  );
}

export {TireFormModal};
