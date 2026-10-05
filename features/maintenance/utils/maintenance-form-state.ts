import {DEFAULT_INSTALLMENT_INTERVAL_DAYS} from '@/features/financial/utils/installment-schedule';
import type {VehicleSelectOption} from '@/features/vehicles/types';

import type {MaintenanceRecord} from '../types';
import type {CreateMaintenanceRecordInput} from '../validation';

/**
 * diagnosis/solution/notes não têm campo no formulário e não são enviados:
 * o update preserva o valor gravado mesmo quando o registro veio da listagem.
 */
export type MaintenanceFormState = Omit<
  CreateMaintenanceRecordInput,
  'diagnosis' | 'solution' | 'notes'
>;

/** Campos de `MaintenanceRecord` lidos pelo formulário e regravados no update. */
export const MAINTENANCE_FORM_SOURCE_FIELDS = [
  'vehicleId',
  'branchId',
  'maintenanceType',
  'priority',
  'maintenanceStatus',
  'supplierId',
  'supplier',
  'openedAt',
  'completedAt',
  'odometerKm',
  'hourMeter',
  'description',
  'estimatedAmount',
  'finalAmount',
  'responsible',
  'paymentType',
  'paymentDueDate',
  'installmentCount',
  'installmentIntervalDays',
] as const satisfies readonly (keyof MaintenanceRecord)[];

export function toLocalDateTimeValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export function resolveBranchIdFromVehicle(
  vehicles: VehicleSelectOption[],
  vehicleId: string,
): string | null {
  return vehicles.find((v) => v.id === vehicleId)?.branchId ?? null;
}

export function buildMaintenanceFormState(
  record: MaintenanceRecord | null | undefined,
  vehicles: VehicleSelectOption[],
): MaintenanceFormState {
  const initialVehicleId = record?.vehicleId ?? vehicles[0]?.id ?? '';
  return {
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
    estimatedAmount: record?.estimatedAmount ?? null,
    finalAmount: record?.finalAmount ?? null,
    responsible: record?.responsible ?? null,
    paymentType: record?.paymentType ?? 'cash',
    paymentDueDate: record?.paymentDueDate ?? null,
    installmentCount: record?.installmentCount ?? 1,
    installmentIntervalDays:
      record?.installmentIntervalDays ?? DEFAULT_INSTALLMENT_INTERVAL_DAYS,
  };
}

export function buildMaintenanceFormPayload(
  formData: MaintenanceFormState,
  vehicles: VehicleSelectOption[],
) {
  return {
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
}
