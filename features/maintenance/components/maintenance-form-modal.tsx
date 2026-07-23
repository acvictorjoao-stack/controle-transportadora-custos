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
import {
  OPERATION_PAYMENT_TYPE_LABELS,
  OPERATION_PAYMENT_TYPES,
} from '@/features/financial/constants/operation-financial';
import type {BranchSelectOption} from '@/features/organization/branches/types';
import type {DriverSelectOption} from '@/features/drivers/types';
import type {VehicleSelectOption} from '@/features/vehicles/types';
import type {TripSelectOption} from '@/features/trips/types';

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
  branches: BranchSelectOption[];
  drivers: DriverSelectOption[];
  vehicles: VehicleSelectOption[];
  trips?: TripSelectOption[];
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

function MaintenanceFormModal({
  open,
  onClose,
  record,
  branches,
  drivers,
  vehicles,
  trips = [],
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
        branches={branches}
        drivers={drivers}
        vehicles={vehicles}
        trips={trips}
        onClose={onClose}
        onSaved={onSaved}
      />
    </Modal>
  );
}

function MaintenanceFormContent({
  record,
  isEdit,
  branches,
  drivers,
  vehicles,
  trips,
  onClose,
  onSaved,
}: {
  record?: MaintenanceRecord | null;
  isEdit: boolean;
  branches: BranchSelectOption[];
  drivers: DriverSelectOption[];
  vehicles: VehicleSelectOption[];
  trips: TripSelectOption[];
  onClose: () => void;
  onSaved: (record: MaintenanceRecord) => void;
}) {
  const [formData, setFormData] = React.useState<CreateMaintenanceRecordInput>(() => ({
    vehicleId: record?.vehicleId ?? vehicles[0]?.id ?? '',
    driverId: record?.driverId ?? null,
    tripId: record?.tripId ?? null,
    branchId: record?.branchId ?? null,
    maintenanceType: record?.maintenanceType ?? 'corrective',
    priority: record?.priority ?? 'medium',
    maintenanceStatus: record?.maintenanceStatus ?? 'open',
    supplier: record?.supplier ?? null,
    workshop: record?.workshop ?? null,
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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    const payload = {
      ...formData,
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
            onChange={(e) => updateField('vehicleId', e.target.value)}
            className={MAINTENANCE_NATIVE_SELECT_CLASS}
            required
          >
            <option value="">Selecione</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.plate}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Motorista" htmlFor="maint-driver" error={fieldErrors.driverId}>
          <select
            id="maint-driver"
            value={formData.driverId ?? ''}
            onChange={(e) => updateField('driverId', e.target.value || null)}
            className={MAINTENANCE_NATIVE_SELECT_CLASS}
          >
            <option value="">Nenhum</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Viagem" htmlFor="maint-trip" error={fieldErrors.tripId}>
          <select
            id="maint-trip"
            value={formData.tripId ?? ''}
            onChange={(e) => updateField('tripId', e.target.value || null)}
            className={MAINTENANCE_NATIVE_SELECT_CLASS}
          >
            <option value="">Nenhuma</option>
            {trips.map((t) => (
              <option key={t.id} value={t.id}>{t.tripNumber}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Filial" htmlFor="maint-branch" error={fieldErrors.branchId}>
          <select
            id="maint-branch"
            value={formData.branchId ?? ''}
            onChange={(e) => updateField('branchId', e.target.value || null)}
            className={MAINTENANCE_NATIVE_SELECT_CLASS}
          >
            <option value="">Nenhuma</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
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

        <FormField label="Fornecedor" htmlFor="maint-supplier" error={fieldErrors.supplier}>
          <Input
            id="maint-supplier"
            value={formData.supplier ?? ''}
            onChange={(e) => updateField('supplier', e.target.value || null)}
          />
        </FormField>

        <FormField label="Oficina" htmlFor="maint-workshop" error={fieldErrors.workshop}>
          <Input
            id="maint-workshop"
            value={formData.workshop ?? ''}
            onChange={(e) => updateField('workshop', e.target.value || null)}
          />
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

        <FormField label="Data conclusão" htmlFor="maint-completed" error={fieldErrors.completedAt}>
          <Input
            id="maint-completed"
            type="datetime-local"
            value={formData.completedAt ?? ''}
            onChange={(e) => updateField('completedAt', e.target.value || null)}
          />
        </FormField>

        <FormField label="Odômetro (km)" htmlFor="maint-odometer" error={fieldErrors.odometerKm}>
          <Input
            id="maint-odometer"
            type="number"
            step="0.01"
            value={formData.odometerKm ?? ''}
            onChange={(e) => updateField('odometerKm', e.target.value ? Number(e.target.value) : null)}
          />
        </FormField>

        <FormField label="Horímetro" htmlFor="maint-hour" error={fieldErrors.hourMeter}>
          <Input
            id="maint-hour"
            type="number"
            step="0.01"
            value={formData.hourMeter ?? ''}
            onChange={(e) => updateField('hourMeter', e.target.value ? Number(e.target.value) : null)}
          />
        </FormField>

        <FormField label="Valor estimado" htmlFor="maint-estimated" error={fieldErrors.estimatedAmount}>
          <Input
            id="maint-estimated"
            type="number"
            step="0.01"
            value={formData.estimatedAmount ?? ''}
            onChange={(e) => updateField('estimatedAmount', e.target.value ? Number(e.target.value) : null)}
          />
        </FormField>

        <FormField label="Valor final" htmlFor="maint-final" error={fieldErrors.finalAmount}>
          <Input
            id="maint-final"
            type="number"
            step="0.01"
            value={formData.finalAmount ?? ''}
            onChange={(e) => updateField('finalAmount', e.target.value ? Number(e.target.value) : null)}
          />
        </FormField>

        <FormField
          label="Forma de pagamento"
          htmlFor="maint-payment-type"
          error={fieldErrors.paymentType}
        >
          <select
            id="maint-payment-type"
            value={formData.paymentType}
            onChange={(e) => {
              const value = e.target.value as (typeof OPERATION_PAYMENT_TYPES)[number];
              updateField('paymentType', value);
              if (value === 'cash') updateField('paymentDueDate', null);
            }}
            className={MAINTENANCE_NATIVE_SELECT_CLASS}
          >
            {OPERATION_PAYMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {OPERATION_PAYMENT_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </FormField>

        {formData.paymentType === 'credit' && (
          <FormField
            label="Vencimento"
            htmlFor="maint-payment-due"
            error={fieldErrors.paymentDueDate}
            required
          >
            <Input
              id="maint-payment-due"
              type="date"
              value={formData.paymentDueDate ?? ''}
              onChange={(e) => updateField('paymentDueDate', e.target.value || null)}
              required
            />
          </FormField>
        )}

        <FormField label="Responsável" htmlFor="maint-responsible" error={fieldErrors.responsible}>
          <Input
            id="maint-responsible"
            value={formData.responsible ?? ''}
            onChange={(e) => updateField('responsible', e.target.value || null)}
          />
        </FormField>
      </div>

      <FormField label="Descrição" htmlFor="maint-description" error={fieldErrors.description}>
        <Textarea
          id="maint-description"
          value={formData.description ?? ''}
          onChange={(e) => updateField('description', e.target.value || null)}
        />
      </FormField>

      <FormField label="Diagnóstico" htmlFor="maint-diagnosis" error={fieldErrors.diagnosis}>
        <Textarea
          id="maint-diagnosis"
          value={formData.diagnosis ?? ''}
          onChange={(e) => updateField('diagnosis', e.target.value || null)}
        />
      </FormField>

      <FormField label="Solução" htmlFor="maint-solution" error={fieldErrors.solution}>
        <Textarea
          id="maint-solution"
          value={formData.solution ?? ''}
          onChange={(e) => updateField('solution', e.target.value || null)}
        />
      </FormField>

      <FormField label="Observações" htmlFor="maint-notes" error={fieldErrors.notes}>
        <Textarea
          id="maint-notes"
          value={formData.notes ?? ''}
          onChange={(e) => updateField('notes', e.target.value || null)}
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
