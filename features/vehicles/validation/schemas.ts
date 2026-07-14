import {z} from 'zod';

import {
  VEHICLE_ASSET_STATUSES,
  VEHICLE_BODY_TYPE_OPTIONS,
  VEHICLE_FUEL_TYPES,
} from '../constants/enums';
import {
  isValidPlate,
  normalizeChassis,
  normalizeDecimal,
  normalizeInteger,
  normalizeOdometer,
  normalizePlate,
  normalizeRenavam,
  normalizeUpperText,
  normalizeYear,
} from '../utils/vehicle-format';

const optionalUpperString = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => normalizeUpperText(v));

const plateSchema = z
  .string()
  .trim()
  .min(1, 'Informe a placa.')
  .transform((v) => normalizePlate(v))
  .refine((v) => isValidPlate(v), {
    message: 'Placa inválida. Use o padrão ABC-1234 ou ABC-1D45.',
  });

const renavamSchema = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => normalizeRenavam(v));

const chassisSchema = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => normalizeChassis(v));

export const vehicleAssetStatusSchema = z.enum(VEHICLE_ASSET_STATUSES);

export const vehicleFuelTypeSchema = z.enum(VEHICLE_FUEL_TYPES);

export const vehicleBodyTypeSchema = z.enum(VEHICLE_BODY_TYPE_OPTIONS);

const vehicleBaseSchema = z.object({
  plate: plateSchema,
  vehicleType: z.string().trim().min(1, 'Informe o tipo do veículo.'),
  bodyType: z
    .union([vehicleBodyTypeSchema, z.literal(''), z.null()])
    .optional()
    .transform((v) => (v && v.length ? v : null)),
  brand: optionalUpperString,
  model: optionalUpperString,
  year: z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((v) => normalizeYear(v))
    .refine((v) => v === null || (v >= 1900 && v <= 2100), {
      message: 'Ano inválido.',
    }),
  renavam: renavamSchema,
  chassis: chassisSchema,
  color: optionalUpperString,
  fuelType: vehicleFuelTypeSchema.nullable().optional(),
  loadCapacityKg: z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((v) => normalizeDecimal(v)),
  grossWeightKg: z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((v) => normalizeDecimal(v)),
  tareKg: z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((v) => normalizeDecimal(v)),
  axles: z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((v) => normalizeInteger(v)),
  initialOdometerKm: z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((v) => normalizeOdometer(v, 0)),
  assetStatus: vehicleAssetStatusSchema.optional().default('active'),
  branchId: z
    .string()
    .uuid('Filial inválida.')
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  notes: optionalUpperString,
});

export const createVehicleSchema = vehicleBaseSchema;

export const updateVehicleSchema = vehicleBaseSchema.extend({
  currentOdometerKm: z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === null || v === '') return undefined;
      return normalizeOdometer(v, 0);
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
