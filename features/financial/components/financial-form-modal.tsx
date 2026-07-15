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
import type {TripSelectOption} from '@/features/trips/types';

import {createFinancialEntryAction, updateFinancialEntryAction} from '../actions';
import {FINANCIAL_ENTRY_STATUSES, FINANCIAL_ENTRY_TYPES} from '../constants/enums';
import type {
  FinancialCategory,
  FinancialCostCenter,
  FinancialEntry,
  FinancialEntryStatus,
  FinancialEntryType,
} from '../types';
import {
  FINANCIAL_ENTRY_STATUS_LABELS,
  FINANCIAL_ENTRY_TYPE_LABELS,
} from '../types/financial-entry';
import type {CreateFinancialEntryInput} from '../validation';
import {financialInputClassName} from '../utils/form-styles';

export interface FinancialFormModalProps {
  open: boolean;
  onClose: () => void;
  entry?: FinancialEntry | null;
  branches: BranchSelectOption[];
  drivers: DriverSelectOption[];
  vehicles: VehicleSelectOption[];
  trips?: TripSelectOption[];
  categories: FinancialCategory[];
  costCenters: FinancialCostCenter[];
  onSaved: (entry: FinancialEntry) => void;
}

type FieldErrors = Partial<Record<keyof CreateFinancialEntryInput, string>>;

function toLocalDateValue(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function FinancialFormModal({
  open,
  onClose,
  entry,
  branches,
  drivers,
  vehicles,
  trips = [],
  categories,
  costCenters,
  onSaved,
}: FinancialFormModalProps) {
  const isEdit = Boolean(entry);
  const formKey = `${open}-${entry?.id ?? 'new'}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar lançamento' : 'Novo lançamento'}
      description={
        isEdit
          ? 'Atualize os dados do lançamento financeiro'
          : 'Registre um novo lançamento financeiro'
      }
      size="xl"
    >
      <FinancialFormContent
        key={formKey}
        entry={entry}
        isEdit={isEdit}
        branches={branches}
        drivers={drivers}
        vehicles={vehicles}
        trips={trips}
        categories={categories}
        costCenters={costCenters}
        onClose={onClose}
        onSaved={onSaved}
      />
    </Modal>
  );
}

function FinancialFormContent({
  entry,
  isEdit,
  branches,
  drivers,
  vehicles,
  trips,
  categories,
  costCenters,
  onClose,
  onSaved,
}: {
  entry?: FinancialEntry | null;
  isEdit: boolean;
  branches: BranchSelectOption[];
  drivers: DriverSelectOption[];
  vehicles: VehicleSelectOption[];
  trips: TripSelectOption[];
  categories: FinancialCategory[];
  costCenters: FinancialCostCenter[];
  onClose: () => void;
  onSaved: (entry: FinancialEntry) => void;
}) {
  const [formData, setFormData] = React.useState<CreateFinancialEntryInput>(() => ({
    entryType: entry?.entryType ?? 'expense',
    entryStatus: entry?.entryStatus ?? 'pending',
    amount: entry?.amount ?? 0,
    entryDate: entry?.entryDate
      ? toLocalDateValue(entry.entryDate)
      : toLocalDateValue(new Date().toISOString()),
    dueDate: entry?.dueDate ? toLocalDateValue(entry.dueDate) : null,
    categoryId: entry?.categoryId ?? null,
    costCenterId: entry?.costCenterId ?? null,
    branchId: entry?.branchId ?? null,
    vehicleId: entry?.vehicleId ?? null,
    driverId: entry?.driverId ?? null,
    tripId: entry?.tripId ?? null,
    description: entry?.description ?? null,
    referenceNumber: entry?.referenceNumber ?? null,
    supplier: entry?.supplier ?? null,
    client: entry?.client ?? null,
    notes: entry?.notes ?? null,
    currency: entry?.currency ?? 'BRL',
  }));
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const toast = useToast();

  function updateField<K extends keyof CreateFinancialEntryInput>(
    field: K,
    value: CreateFinancialEntryInput[K],
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

    const result =
      isEdit && entry
        ? await updateFinancialEntryAction(entry.id, formData)
        : await createFinancialEntryAction(formData);

    if (!result.success) {
      setFormError(result.error);
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors as FieldErrors);
      }
      setSubmitting(false);
      return;
    }

    onSaved(result.data);
    toast.success(isEdit ? 'Lançamento atualizado com sucesso' : 'Lançamento criado com sucesso');
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
        <FormField label="Tipo" htmlFor="financial-type" error={fieldErrors.entryType}>
          <select
            id="financial-type"
            value={formData.entryType}
            onChange={(e) => updateField('entryType', e.target.value as FinancialEntryType)}
            className={financialInputClassName}
            required
          >
            {FINANCIAL_ENTRY_TYPES.map((type) => (
              <option key={type} value={type}>
                {FINANCIAL_ENTRY_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Status" htmlFor="financial-status" error={fieldErrors.entryStatus}>
          <select
            id="financial-status"
            value={formData.entryStatus ?? 'pending'}
            onChange={(e) =>
              updateField('entryStatus', e.target.value as FinancialEntryStatus)
            }
            className={financialInputClassName}
          >
            {FINANCIAL_ENTRY_STATUSES.map((status) => (
              <option key={status} value={status}>
                {FINANCIAL_ENTRY_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Valor" htmlFor="financial-amount" error={fieldErrors.amount}>
          <Input
            id="financial-amount"
            type="number"
            step="0.01"
            min="0"
            value={formData.amount || ''}
            onChange={(e) => updateField('amount', Number(e.target.value))}
            required
          />
        </FormField>
        <FormField label="Data do lançamento" htmlFor="financial-entry-date" error={fieldErrors.entryDate}>
          <Input
            id="financial-entry-date"
            type="date"
            value={formData.entryDate}
            onChange={(e) => updateField('entryDate', e.target.value)}
            required
          />
        </FormField>
        <FormField label="Vencimento" htmlFor="financial-due-date" error={fieldErrors.dueDate}>
          <Input
            id="financial-due-date"
            type="date"
            value={formData.dueDate ?? ''}
            onChange={(e) => updateField('dueDate', e.target.value || null)}
          />
        </FormField>
        <FormField label="Categoria" htmlFor="financial-category" error={fieldErrors.categoryId}>
          <select
            id="financial-category"
            value={formData.categoryId ?? ''}
            onChange={(e) => updateField('categoryId', e.target.value || null)}
            className={financialInputClassName}
          >
            <option value="">Sem categoria</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField
          label="Centro de custo"
          htmlFor="financial-cost-center"
          error={fieldErrors.costCenterId}
        >
          <select
            id="financial-cost-center"
            value={formData.costCenterId ?? ''}
            onChange={(e) => updateField('costCenterId', e.target.value || null)}
            className={financialInputClassName}
          >
            <option value="">Sem centro de custo</option>
            {costCenters.map((center) => (
              <option key={center.id} value={center.id}>
                {center.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Filial" htmlFor="financial-branch" error={fieldErrors.branchId}>
          <select
            id="financial-branch"
            value={formData.branchId ?? ''}
            onChange={(e) => updateField('branchId', e.target.value || null)}
            className={financialInputClassName}
          >
            <option value="">Sem filial</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Veículo" htmlFor="financial-vehicle" error={fieldErrors.vehicleId}>
          <select
            id="financial-vehicle"
            value={formData.vehicleId ?? ''}
            onChange={(e) => updateField('vehicleId', e.target.value || null)}
            className={financialInputClassName}
          >
            <option value="">Sem veículo</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.plate} {vehicle.model ? `— ${vehicle.model}` : ''}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Motorista" htmlFor="financial-driver" error={fieldErrors.driverId}>
          <select
            id="financial-driver"
            value={formData.driverId ?? ''}
            onChange={(e) => updateField('driverId', e.target.value || null)}
            className={financialInputClassName}
          >
            <option value="">Sem motorista</option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Viagem (opcional)" htmlFor="financial-trip" error={fieldErrors.tripId}>
          <select
            id="financial-trip"
            value={formData.tripId ?? ''}
            onChange={(e) => updateField('tripId', e.target.value || null)}
            className={financialInputClassName}
          >
            <option value="">Sem viagem</option>
            {trips.map((trip) => (
              <option key={trip.id} value={trip.id}>
                {trip.tripNumber}
              </option>
            ))}
          </select>
        </FormField>
        <FormField
          label="Número de referência"
          htmlFor="financial-reference"
          error={fieldErrors.referenceNumber}
        >
          <Input
            id="financial-reference"
            value={formData.referenceNumber ?? ''}
            onChange={(e) => updateField('referenceNumber', e.target.value || null)}
          />
        </FormField>
      </div>

      <FormField label="Descrição" htmlFor="financial-description" error={fieldErrors.description}>
        <Input
          id="financial-description"
          value={formData.description ?? ''}
          onChange={(e) => updateField('description', e.target.value || null)}
        />
      </FormField>

      <FormField label="Observações" htmlFor="financial-notes" error={fieldErrors.notes}>
        <Textarea
          id="financial-notes"
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

export {FinancialFormModal};
