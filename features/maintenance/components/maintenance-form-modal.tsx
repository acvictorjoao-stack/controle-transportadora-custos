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
import {OperationPaymentFields} from '@/features/financial/components/operation-payment-fields';
import {DEFAULT_INSTALLMENT_INTERVAL_DAYS} from '@/features/financial/utils/installment-schedule';
import {SupplierSelect} from '@/features/suppliers/components';
import {useSupplierOptions} from '@/features/suppliers/hooks/use-supplier-options';
import type {SupplierSelectOption} from '@/features/suppliers/types';
import type {VehicleSelectOption} from '@/features/vehicles/types';

import {createMaintenanceRecordAction, updateMaintenanceRecordAction} from '../actions';
import {
  MAINTENANCE_PRIORITIES,
  MAINTENANCE_STATUSES,
  MAINTENANCE_TYPES,
} from '../constants/enums';
import type {MaintenanceRecord, MaintenanceStatus, MaintenanceType} from '../types';
import {
  MAINTENANCE_PRIORITY_LABELS,
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_TYPE_LABELS,
} from '../types';
import type {CreateMaintenanceRecordInput} from '../validation';
import {MAINTENANCE_NATIVE_SELECT_CLASS} from '../utils/form-styles';

export interface MaintenanceFormModalProps {
  open: boolean;
  onClose: () => void;
  record?: MaintenanceRecord | null;
  vehicles: VehicleSelectOption[];
  suppliers: SupplierSelectOption[];
  onSaved: (record: MaintenanceRecord) => void;
}

type FieldErrors = Partial<Record<keyof CreateMaintenanceRecordInput, string>>;

function toLocalDateTimeValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function resolveBranchIdFromVehicle(
  vehicles: VehicleSelectOption[],
  vehicleId: string,
): string | null {
  return vehicles.find((v) => v.id === vehicleId)?.branchId ?? null;
}

function MaintenanceFormModal({
  open,
  onClose,
  record,
  vehicles,
  suppliers,
  onSaved,
}: MaintenanceFormModalProps) {
  const isEdit = Boolean(record);
  const formKey = `${open}-${record?.id ?? 'new'}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar manutenção' : 'Nova manutenção'}
      description={
        isEdit ? 'Atualize os dados da manutenção' : 'Registre uma nova manutenção da frota'
      }
      size="xl"
    >
      <MaintenanceFormContent
        key={formKey}
        record={record}
        isEdit={isEdit}
        vehicles={vehicles}
        suppliers={suppliers}
        onClose={onClose}
        onSaved={onSaved}
      />
    </Modal>
  );
}

function MaintenanceFormContent({
  record,
  isEdit,
  vehicles,
  suppliers: initialSuppliers,
  onClose,
  onSaved,
}: {
  record?: MaintenanceRecord | null;
  isEdit: boolean;
  vehicles: VehicleSelectOption[];
  suppliers: SupplierSelectOption[];
  onClose: () => void;
  onSaved: (record: MaintenanceRecord) => void;
}) {
  const initialVehicleId = record?.vehicleId ?? vehicles[0]?.id ?? '';
  const {options: suppliers, onOptionsChange} = useSupplierOptions(initialSuppliers);

  const [formData, setFormData] = React.useState<CreateMaintenanceRecordInput>(() => ({
    vehicleId: initialVehicleId,
    branchId:
      record?.branchId ?? resolveBranchIdFromVehicle(vehicles, initialVehicleId),
    maintenanceType: record?.maintenanceType ?? 'corrective',
    priority: record?.priority ?? 'medium',
    maintenanceStatus: record?.maintenanceStatus ?? 'open',
    supplierId: record?.supplierId ?? '',
    supplier: record?.supplier ?? '',
    workshop: null,
    openedAt: record?.openedAt
      ? toLocalDateTimeValue(record.openedAt)
      : toLocalDateTimeValue(new Date().toISOString()),
    completedAt: record?.completedAt ? toLocalDateTimeValue(record.completedAt) : null,
    odometerKm: record?.odometerKm ?? null,
    hourMeter: record?.hourMeter ?? null,
    description: record?.description ?? null,
    diagnosis: record?.diagnosis ?? null,
    solution: record?.solution ?? null,
    notes: record?.notes ?? null,
    estimatedAmount: record?.estimatedAmount ?? null,
    finalAmount: record?.finalAmount ?? null,
    responsible: record?.responsible ?? null,
    paymentType: record?.paymentType ?? 'cash',
    paymentDueDate: record?.paymentDueDate ?? null,
    installmentCount: record?.installmentCount ?? 1,
    installmentIntervalDays:
      record?.installmentIntervalDays ?? DEFAULT_INSTALLMENT_INTERVAL_DAYS,
  }));

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const toast = useToast();

  function updateField<K extends keyof CreateMaintenanceRecordInput>(
    key: K,
    value: CreateMaintenanceRecordInput[K],
  ) {
    setFormData((prev) => ({...prev, [key]: value}));
    setFieldErrors((prev) => ({...prev, [key]: undefined}));
  }

  function handleVehicleChange(vehicleId: string) {
    setFormData((prev) => ({
      ...prev,
      vehicleId,
      branchId: resolveBranchIdFromVehicle(vehicles, vehicleId),
    }));
    setFieldErrors((prev) => ({
      ...prev,
      vehicleId: undefined,
      branchId: undefined,
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    const payload = {
      ...formData,
      workshop: null,
      branchId:
        formData.branchId ??
        resolveBranchIdFromVehicle(vehicles, formData.vehicleId),
      openedAt: formData.openedAt.includes('T')
        ? new Date(formData.openedAt).toISOString()
        : formData.openedAt,
      completedAt: formData.completedAt
        ? new Date(formData.completedAt).toISOString()
        : null,
    };

    const result = isEdit && record
      ? await updateMaintenanceRecordAction(record.id, payload)
      : await createMaintenanceRecordAction(payload);

    setLoading(false);

    if (!result.success) {
      setError(result.error);
      if (result.fieldErrors) setFieldErrors(result.fieldErrors as FieldErrors);
      return;
    }

    onSaved(result.data);
    toast.success(isEdit ? 'Manutenção atualizada com sucesso' : 'Manutenção criada com sucesso');
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
        <FormField label="Veículo" htmlFor="maint-vehicle" error={fieldErrors.vehicleId} required>
          <select
            id="maint-vehicle"
            value={formData.vehicleId}
            onChange={(e) => handleVehicleChange(e.target.value)}
            className={MAINTENANCE_NATIVE_SELECT_CLASS}
            required
          >
            <option value="">Selecione</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.plate}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Tipo" htmlFor="maint-type" error={fieldErrors.maintenanceType} required>
          <select
            id="maint-type"
            value={formData.maintenanceType}
            onChange={(e) => updateField('maintenanceType', e.target.value as MaintenanceType)}
            className={MAINTENANCE_NATIVE_SELECT_CLASS}
            required
          >
            {MAINTENANCE_TYPES.map((type) => (
              <option key={type} value={type}>{MAINTENANCE_TYPE_LABELS[type]}</option>
            ))}
          </select>
        </FormField>

        <FormField
          label="Fornecedor"
          htmlFor="maint-supplier"
          error={fieldErrors.supplierId ?? fieldErrors.supplier}
          required
        >
          <SupplierSelect
            id="maint-supplier"
            value={formData.supplierId || null}
            options={suppliers}
            onOptionsChange={onOptionsChange}
            required
            defaultCategories={['oficina']}
            onChange={(supplierId, option) => {
              setFormData((prev) => ({
                ...prev,
                supplierId: supplierId ?? '',
                supplier: option?.displayName ?? '',
              }));
              setFieldErrors((prev) => {
                const next = {...prev};
                delete next.supplierId;
                delete next.supplier;
                return next;
              });
            }}
          />
        </FormField>

        <FormField label="Prioridade" htmlFor="maint-priority" error={fieldErrors.priority}>
          <select
            id="maint-priority"
            value={formData.priority}
            onChange={(e) => updateField('priority', e.target.value as CreateMaintenanceRecordInput['priority'])}
            className={MAINTENANCE_NATIVE_SELECT_CLASS}
          >
            {MAINTENANCE_PRIORITIES.map((p) => (
              <option key={p} value={p}>{MAINTENANCE_PRIORITY_LABELS[p]}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Status" htmlFor="maint-status" error={fieldErrors.maintenanceStatus}>
          <select
            id="maint-status"
            value={formData.maintenanceStatus}
            onChange={(e) => updateField('maintenanceStatus', e.target.value as MaintenanceStatus)}
            className={MAINTENANCE_NATIVE_SELECT_CLASS}
          >
            {MAINTENANCE_STATUSES.map((s) => (
              <option key={s} value={s}>{MAINTENANCE_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Data abertura" htmlFor="maint-opened" error={fieldErrors.openedAt} required>
          <Input
            id="maint-opened"
            type="datetime-local"
            value={formData.openedAt}
            onChange={(e) => updateField('openedAt', e.target.value)}
            required
          />
        </FormField>

        <FormField label="Valor" htmlFor="maint-final" error={fieldErrors.finalAmount}>
          <Input
            id="maint-final"
            type="number"
            step="0.01"
            min="0"
            value={formData.finalAmount ?? ''}
            onChange={(e) => {
              const value = e.target.value ? Number(e.target.value) : null;
              setFormData((prev) => ({
                ...prev,
                finalAmount: value,
                estimatedAmount: value,
              }));
              setFieldErrors((prev) => ({
                ...prev,
                finalAmount: undefined,
                estimatedAmount: undefined,
              }));
            }}
          />
        </FormField>

        <OperationPaymentFields
          idPrefix="maint"
          selectClassName={MAINTENANCE_NATIVE_SELECT_CLASS}
          totalAmount={formData.finalAmount}
          value={{
            paymentType: formData.paymentType,
            paymentDueDate: formData.paymentDueDate,
            installmentCount: formData.installmentCount,
            installmentIntervalDays: formData.installmentIntervalDays,
          }}
          onChange={(patch) => {
            setFormData((prev) => ({...prev, ...patch}));
            setFieldErrors((prev) => {
              const next = {...prev};
              for (const key of Object.keys(patch) as (keyof typeof patch)[]) {
                next[key] = undefined;
              }
              return next;
            });
          }}
          errors={{
            paymentType: fieldErrors.paymentType,
            paymentDueDate: fieldErrors.paymentDueDate,
            installmentCount: fieldErrors.installmentCount,
            installmentIntervalDays: fieldErrors.installmentIntervalDays,
          }}
        />
      </div>

      <FormField label="Descrição" htmlFor="maint-description" error={fieldErrors.description}>
        <Textarea
          id="maint-description"
          value={formData.description ?? ''}
          onChange={(e) => updateField('description', e.target.value || null)}
        />
      </FormField>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {isEdit ? 'Salvar' : 'Cadastrar'}
        </Button>
      </div>
    </form>
  );
}

export {MaintenanceFormModal};
