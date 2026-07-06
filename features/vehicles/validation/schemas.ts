import {z} from 'zod';

import {
  VEHICLE_ASSET_STATUSES,
  VEHICLE_FUEL_TYPES,
} from '../constants/enums';

const optionalString = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null) return null;
    const trimmed = v.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

const optionalNumber = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null || v === '') return null;
    const num = typeof v === 'number' ? v : Number(v.replace(',', '.'));
    return Number.isFinite(num) ? num : null;
  });

const plateSchema = z
  .string()
  .trim()
  .min(1, 'Informe a placa.')
  .max(10, 'Placa inválida.')
  .transform((v) => v.toUpperCase().replace(/[^A-Z0-9]/g, ''));

export const vehicleAssetStatusSchema = z.enum(VEHICLE_ASSET_STATUSES);

export const vehicleFuelTypeSchema = z.enum(VEHICLE_FUEL_TYPES);

const vehicleBaseSchema = z.object({
  plate: plateSchema,
  vehicleType: z.string().trim().min(1, 'Informe o tipo do veículo.'),
  brand: optionalString,
  model: optionalString,
  year: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === null || v === '') return null;
      const num = typeof v === 'number' ? v : Number(v);
      return Number.isInteger(num) && num >= 1900 && num <= 2100 ? num : null;
    }),
  renavam: optionalString,
  chassis: optionalString,
  color: optionalString,
  fuelType: vehicleFuelTypeSchema.nullable().optional(),
  loadCapacityKg: optionalNumber,
  grossWeightKg: optionalNumber,
  tareKg: optionalNumber,
  axles: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === null || v === '') return null;
      const num = typeof v === 'number' ? v : Number(v);
      return Number.isInteger(num) && num > 0 ? num : null;
    }),
  initialOdometerKm: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === null || v === '') return 0;
      const num = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
      return Number.isFinite(num) && num >= 0 ? num : 0;
    }),
  assetStatus: vehicleAssetStatusSchema.optional().default('active'),
  branchId: z
    .string()
    .uuid('Filial inválida.')
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  notes: optionalString,
});

export const createVehicleSchema = vehicleBaseSchema;

export const updateVehicleSchema = vehicleBaseSchema.extend({
  currentOdometerKm: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === null || v === '') return undefined;
      const num = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
      return Number.isFinite(num) && num >= 0 ? num : undefined;
    }),
});

export const updateVehicleStatusSchema = z.object({
  assetStatus: vehicleAssetStatusSchema,
});

export const uploadVehicleFileSchema = z.object({
  vehicleId: z.string().uuid(),
  fileUrl: z.string().url(),
  storagePath: z.string().trim().min(1),
  name: z.string().trim().min(1),
  documentType: z.enum(['photo', 'crlv', 'document']),
  mimeType: z.string().optional().nullable(),
  fileSize: z.number().optional().nullable(),
});

/** Campos aceitos pelo formulário de cadastro/edição (sem frota e horímetro). */
export type CreateVehicleFormInput = z.infer<typeof createVehicleSchema>;

/** Compatível com a camada de persistência; frota e horímetro permanecem opcionais. */
export type CreateVehicleInput = CreateVehicleFormInput & {
  fleetNumber?: string | null;
  hourMeter?: number | null;
};

export type UpdateVehicleFormInput = z.infer<typeof updateVehicleSchema>;

export type UpdateVehicleInput = UpdateVehicleFormInput & {
  fleetNumber?: string | null;
  hourMeter?: number | null;
};
export type UpdateVehicleStatusInput = z.infer<typeof updateVehicleStatusSchema>;
export type UploadVehicleFileInput = z.infer<typeof uploadVehicleFileSchema>;
