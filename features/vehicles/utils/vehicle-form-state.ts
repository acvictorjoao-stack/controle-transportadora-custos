import type {Vehicle, VehicleAssetStatus, VehicleBodyType, VehicleFuelType} from '../types';
import {
  formatChassisInput,
  formatPlateInput,
  formatRenavamInput,
  toUpperTrimmed,
} from './vehicle-format';

export type VehicleFormState = {
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

/**
 * Campos de `Vehicle` que o formulário exibe e regrava no update. Um campo
 * ausente aqui viraria `null` no banco ao salvar, por isso a edição exige o
 * registro completo (getVehicleById), nunca a linha parcial da listagem.
 */
export const VEHICLE_FORM_SOURCE_FIELDS = [
  'plate',
  'vehicleType',
  'bodyType',
  'brand',
  'model',
  'year',
  'renavam',
  'chassis',
  'color',
  'fuelType',
  'loadCapacityKg',
  'grossWeightKg',
  'tareKg',
  'axles',
  'initialOdometerKm',
  'currentOdometerKm',
  'assetStatus',
  'branchId',
  'notes',
] as const satisfies readonly (keyof Vehicle)[];

/** Campos que não vieram do banco (coluna fora do SELECT vira `undefined`/`NaN` no mapper). */
export function getMissingVehicleFormFields(vehicle: Vehicle): string[] {
  return VEHICLE_FORM_SOURCE_FIELDS.filter((field) => {
    const value: unknown = vehicle[field];
    return value === undefined || (typeof value === 'number' && Number.isNaN(value));
  });
}

export function buildVehicleFormState(vehicle?: Vehicle | null): VehicleFormState {
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

export function buildVehicleFormPayload(
  formData: VehicleFormState,
  options: {isEdit: boolean; currentOdometerKm: string},
) {
  return {
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
    ...(options.isEdit ? {currentOdometerKm: options.currentOdometerKm || 0} : {}),
  };
}
