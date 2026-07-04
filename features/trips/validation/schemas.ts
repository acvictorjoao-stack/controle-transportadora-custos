import {z} from 'zod';

import {
  TRIP_DOCUMENT_TYPES,
  TRIP_EXPENSE_TYPES,
  TRIP_OCCURRENCE_TYPES,
  TRIP_STATUSES,
} from '../constants/enums';

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v?.length ? v : null));

const optionalNumber = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null || v === '') return null;
    const num = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
    return Number.isFinite(num) ? num : null;
  });

const optionalDateTime = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v?.length ? v : null));

const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v?.length ? v : null));

export const tripStatusSchema = z.enum(TRIP_STATUSES);
export const tripDocumentTypeSchema = z.enum(TRIP_DOCUMENT_TYPES);
export const tripOccurrenceTypeSchema = z.enum(TRIP_OCCURRENCE_TYPES);
export const tripExpenseTypeSchema = z.enum(TRIP_EXPENSE_TYPES);

const tripBaseSchema = z.object({
  branchId: z
    .string()
    .uuid('Filial inválida.')
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  driverId: z
    .string()
    .uuid('Motorista inválido.')
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  vehicleId: z
    .string()
    .uuid('Veículo inválido.')
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  clientName: optionalString,
  contractReference: optionalString,
  customerId: z
    .string()
    .uuid('Cliente inválido.')
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  customerContractId: z
    .string()
    .uuid('Contrato inválido.')
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  freightTable: optionalString,
  contractedFreightValue: optionalNumber,
  actualFreightValue: optionalNumber,
  freightMargin: optionalNumber,
  origin: optionalString,
  destination: optionalString,
  route: optionalString,
  initialOdometerKm: optionalNumber,
  finalOdometerKm: optionalNumber,
  initialHourMeter: optionalNumber,
  finalHourMeter: optionalNumber,
  departedAt: optionalDateTime,
  arrivedAt: optionalDateTime,
  weightKg: optionalNumber,
  volumeM3: optionalNumber,
  cargoType: optionalString,
  notes: optionalString,
  responsible: optionalString,
  tripStatus: tripStatusSchema.optional().default('planned'),
});

export const createTripSchema = tripBaseSchema;

export const updateTripSchema = tripBaseSchema;

export const updateTripStatusSchema = z.object({
  tripStatus: tripStatusSchema,
});

export const uploadTripFileSchema = z.object({
  tripId: z.string().uuid(),
  fileUrl: z.string().url(),
  storagePath: z.string().trim().min(1),
  name: z.string().trim().min(1),
  documentType: tripDocumentTypeSchema,
  mimeType: z.string().optional().nullable(),
  fileSize: z.number().optional().nullable(),
});

export const upsertTripChecklistSchema = z.object({
  tripId: z.string().uuid(),
  tiresOk: z.boolean().nullable().optional(),
  headlightsOk: z.boolean().nullable().optional(),
  brakesOk: z.boolean().nullable().optional(),
  documentationOk: z.boolean().nullable().optional(),
  fuelOk: z.boolean().nullable().optional(),
  odometerReading: optionalNumber,
  hourMeterReading: optionalNumber,
  photoUrls: z.array(z.string().url()).optional().default([]),
  signatureUrl: optionalString,
  notes: optionalString,
  completedAt: optionalDateTime,
});

export const createTripOccurrenceSchema = z.object({
  tripId: z.string().uuid(),
  occurrenceType: tripOccurrenceTypeSchema,
  description: optionalString,
  occurredAt: optionalDateTime,
});

export const createTripExpenseSchema = z.object({
  tripId: z.string().uuid(),
  expenseType: tripExpenseTypeSchema,
  amount: z
    .union([z.string(), z.number()])
    .transform((v) => {
      const num = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
      return Number.isFinite(num) && num >= 0 ? num : 0;
    }),
  currency: z.string().trim().min(1).optional().default('BRL'),
  description: optionalString,
  expenseDate: optionalDate,
  receiptUrl: optionalString,
});

export const createTripStopSchema = z.object({
  tripId: z.string().uuid(),
  clientName: optionalString,
  stopDate: optionalDate,
  stopTime: optionalString,
  latitude: optionalNumber,
  longitude: optionalNumber,
  stoppedMinutes: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === null || v === '') return null;
      const num = typeof v === 'number' ? v : Number(v);
      return Number.isInteger(num) && num >= 0 ? num : null;
    }),
  notes: optionalString,
});

export type CreateTripInput = z.infer<typeof createTripSchema>;
export type UpdateTripInput = z.infer<typeof updateTripSchema>;
export type UpdateTripStatusInput = z.infer<typeof updateTripStatusSchema>;
export type UploadTripFileInput = z.infer<typeof uploadTripFileSchema>;
export type UpsertTripChecklistInput = z.infer<typeof upsertTripChecklistSchema>;
export type CreateTripOccurrenceInput = z.infer<typeof createTripOccurrenceSchema>;
export type CreateTripExpenseInput = z.infer<typeof createTripExpenseSchema>;
export type CreateTripStopInput = z.infer<typeof createTripStopSchema>;
