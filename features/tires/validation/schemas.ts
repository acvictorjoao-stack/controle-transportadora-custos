import {z} from 'zod';

import {
  operationPaymentFieldsSchema,
  refineOperationPaymentFields,
} from '@/features/financial/validation/operation-payment';

import {
  TIRE_DOCUMENT_TYPES,
  TIRE_MOVEMENT_TYPES,
  TIRE_POSITIONS,
  TIRE_STATUSES,
  TIRE_WEAR_LEVELS,
} from '../constants/enums';

// Campos opcionais aceitam null (formulários enviam null para vazio).
const optionalString = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v?.length ? v : null));

const optionalUuid = z
  .string()
  .uuid()
  .nullable()
  .optional()
  .transform((v) => v ?? null);

const optionalNumber = z
  .union([z.number(), z.string()])
  .nullish()
  .transform((v) => {
    if (v === undefined || v === null || v === '') return null;
    const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  });

const nonNegativeNumber = z
  .union([z.number(), z.string()])
  .nullish()
  .transform((v) => {
    if (v === undefined || v === null || v === '') return null;
    const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
    return Number.isFinite(n) && n >= 0 ? n : null;
  });

export const tireStatusSchema = z.enum(TIRE_STATUSES);
export const tirePositionSchema = z.enum(TIRE_POSITIONS);
export const tireMovementTypeSchema = z.enum(TIRE_MOVEMENT_TYPES);
export const tireWearLevelSchema = z.enum(TIRE_WEAR_LEVELS);

const tireBaseSchema = z
  .object({
    branchId: z
      .string()
      .uuid('Filial inválida.')
      .nullable()
      .optional()
      .transform((v) => v ?? null),
    vehicleId: z
      .string()
      .uuid('Veículo inválido.')
      .nullable()
      .optional()
      .transform((v) => v ?? null),
    maintenanceRecordId: z
      .string()
      .uuid('Manutenção inválida.')
      .nullable()
      .optional()
      .transform((v) => v ?? null),
    assetNumber: optionalString,
    internalCode: optionalString,
    brand: optionalString,
    model: optionalString,
    tireSize: optionalString,
    manufacturer: optionalString,
    dotNumber: optionalString,
    fireNumber: optionalString,
    serialNumber: optionalString,
    expectedLifeKm: nonNegativeNumber,
    currentKm: nonNegativeNumber,
    accumulatedKm: nonNegativeNumber,
    purchaseDate: optionalString,
    purchaseValue: nonNegativeNumber,
    supplierId: optionalUuid,
    supplier: optionalString,
    warranty: optionalString,
    tireStatus: tireStatusSchema.default('in_stock'),
    currentPosition: tirePositionSchema.nullable().optional().transform((v) => v ?? null),
    notes: optionalString,
  })
  .merge(operationPaymentFieldsSchema)
  .superRefine((data, ctx) => {
    refineOperationPaymentFields(data, ctx);
  });

export const createTireSchema = tireBaseSchema;
export const updateTireSchema = tireBaseSchema;

export const createTireMovementSchema = z.object({
  tireId: z.string().uuid(),
  vehicleId: z
    .string()
    .uuid('Veículo inválido.')
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  maintenanceRecordId: z
    .string()
    .uuid()
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  branchId: z
    .string()
    .uuid()
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  movementType: tireMovementTypeSchema,
  position: tirePositionSchema.nullable().optional().transform((v) => v ?? null),
  installedAt: optionalString,
  removedAt: optionalString,
  reason: optionalString,
  responsible: optionalString,
  odometerKm: nonNegativeNumber,
  notes: optionalString,
});

export const createTireInspectionSchema = z.object({
  tireId: z.string().uuid(),
  treadDepthMm: nonNegativeNumber,
  pressurePsi: nonNegativeNumber,
  wearLevel: tireWearLevelSchema.nullable().optional().transform((v) => v ?? null),
  inspectedAt: z.string().trim().min(1, 'Informe a data da inspeção.'),
  responsible: optionalString,
  notes: optionalString,
});

export const createTireRecapSchema = z.object({
  tireId: z.string().uuid(),
  supplierId: optionalUuid,
  supplier: optionalString,
  recapNumber: optionalString,
  amount: nonNegativeNumber,
  odometerKm: nonNegativeNumber,
  recappedAt: z.string().trim().min(1, 'Informe a data da recapagem.'),
  warranty: optionalString,
  notes: optionalString,
});

export const uploadTireFileSchema = z.object({
  tireId: z.string().uuid(),
  fileUrl: z.string().url(),
  storagePath: z.string().min(1),
  name: z.string().trim().min(1),
  documentType: z.enum(TIRE_DOCUMENT_TYPES),
  mimeType: optionalString,
  fileSize: z.number().int().positive().nullable().optional(),
});

export type CreateTireInput = z.infer<typeof createTireSchema>;
export type UpdateTireInput = z.infer<typeof updateTireSchema>;
export type CreateTireMovementInput = z.infer<typeof createTireMovementSchema>;
export type CreateTireInspectionInput = z.infer<typeof createTireInspectionSchema>;
export type CreateTireRecapInput = z.infer<typeof createTireRecapSchema>;
export type UploadTireFileInput = z.infer<typeof uploadTireFileSchema>;
