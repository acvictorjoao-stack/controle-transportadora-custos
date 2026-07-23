import {z} from 'zod';

import {
  operationPaymentFieldsSchema,
  refineOperationPaymentFields,
} from '@/features/financial/validation/operation-payment';

import {FUEL_DOCUMENT_TYPES, FUEL_TYPES} from '../constants/enums';

// Campos opcionais aceitam null (formulários enviam null para vazio).
const optionalString = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v?.length ? v : null));

const optionalNumber = z
  .union([z.number(), z.string()])
  .nullish()
  .transform((v) => {
    if (v === undefined || v === null || v === '') return null;
    const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  });

const requiredPositiveNumber = z
  .union([z.number(), z.string()])
  .transform((v) => {
    const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
    return n;
  })
  .refine((v) => Number.isFinite(v) && v > 0, 'Informe um valor maior que zero.');

const nonNegativeNumber = z
  .union([z.number(), z.string()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null || v === '') return null;
    const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
    return Number.isFinite(n) && n >= 0 ? n : null;
  });

export const fuelTypeSchema = z.enum(FUEL_TYPES);

const fuelBaseSchema = z
  .object({
    vehicleId: z.string().uuid('Veículo inválido.'),
    driverId: z.string().uuid('Motorista inválido.'),
    branchId: z
      .string()
      .uuid('Filial inválida.')
      .nullable()
      .optional()
      .transform((v) => v ?? null),
    supplierId: z.string().uuid('Selecione o fornecedor.'),
    stationName: z.string().trim().min(1, 'Informe o posto.'),
    stationBrand: optionalString,
    city: optionalString,
    state: optionalString,
    fueledAt: z.string().trim().min(1, 'Informe a data do abastecimento.'),
    fuelType: fuelTypeSchema,
    quantityLiters: requiredPositiveNumber,
    pricePerLiter: nonNegativeNumber.refine((v) => v !== null, 'Informe o valor por litro.'),
    totalAmount: nonNegativeNumber.refine((v) => v !== null, 'Informe o valor total.'),
    odometerKm: optionalNumber,
    notes: optionalString,
    responsible: optionalString,
  })
  .merge(operationPaymentFieldsSchema)
  .superRefine((data, ctx) => {
    refineOperationPaymentFields(data, ctx);
  });

export const createFuelRecordSchema = fuelBaseSchema;

export const updateFuelRecordSchema = fuelBaseSchema;

export const uploadFuelFileSchema = z.object({
  fuelRecordId: z.string().uuid(),
  fileUrl: z.string().url(),
  storagePath: z.string().trim().min(1),
  name: z.string().trim().min(1),
  documentType: z.enum(FUEL_DOCUMENT_TYPES),
  mimeType: z.string().optional().nullable(),
  fileSize: z.number().optional().nullable(),
});

export type CreateFuelRecordInput = z.infer<typeof createFuelRecordSchema>;
export type UpdateFuelRecordInput = z.infer<typeof updateFuelRecordSchema>;
export type UploadFuelFileInput = z.infer<typeof uploadFuelFileSchema>;
