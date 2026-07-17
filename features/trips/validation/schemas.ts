import {z} from 'zod';

import {
  SIMPLE_TRIP_STATUSES,
  TRIP_DOCUMENT_TYPES,
  TRIP_EXPENSE_TYPES,
  TRIP_OCCURRENCE_TYPES,
  TRIP_STATUSES,
} from '../constants/enums';

// Campos opcionais aceitam null (formulários enviam null para vazio).
const optionalString = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v?.length ? v : null));

const optionalUppercaseString = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v?.length ? v.toUpperCase() : null));

const optionalNumber = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((v) => {
    if (v === undefined || v === null || v === '') return null;
    const num = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
    return Number.isFinite(num) ? num : null;
  });

const optionalOdometer = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((v, ctx) => {
    if (v === undefined || v === null || (typeof v === 'string' && !v.trim())) {
      return null;
    }
    const num = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
    if (!Number.isFinite(num) || num < 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'Informe uma quilometragem válida.',
      });
      return z.NEVER;
    }
    return num;
  });

const optionalDateTime = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v?.length ? v : null));

const optionalDate = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v?.length ? v : null));

export const tripStatusSchema = z.enum(TRIP_STATUSES);
export const simpleTripStatusSchema = z.enum(SIMPLE_TRIP_STATUSES);
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
  customerId: z
    .string()
    .uuid('Cliente inválido.')
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  actualFreightValue: optionalNumber,
  freightMargin: optionalNumber,
  routeId: z
    .string()
    .uuid('Selecione a rota.')
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  origin: optionalUppercaseString,
  destination: optionalUppercaseString,
  route: optionalUppercaseString,
  plannedDistanceKm: optionalNumber,
  plannedDepartureAt: optionalDateTime,
  initialOdometerKm: optionalOdometer,
  finalOdometerKm: optionalOdometer,
  departedAt: optionalDateTime,
  arrivedAt: optionalDateTime,
  weightKg: optionalNumber,
  cargoType: optionalUppercaseString,
  notes: optionalString,
  responsible: optionalString,
  tripStatus: tripStatusSchema.optional().default('planned'),
});

function validateOdometerRange(
  data: {initialOdometerKm: number | null; finalOdometerKm: number | null},
  ctx: z.RefinementCtx,
) {
  if (
    data.initialOdometerKm !== null &&
    data.finalOdometerKm !== null &&
    data.finalOdometerKm < data.initialOdometerKm
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['finalOdometerKm'],
      message: 'O KM final deve ser maior ou igual ao KM inicial.',
    });
  }
}

export const createTripSchema = tripBaseSchema.superRefine((data, ctx) => {
  if (!data.routeId) {
    ctx.addIssue({
      code: 'custom',
      path: ['routeId'],
      message: 'Selecione a rota.',
    });
  }
  validateOdometerRange(data, ctx);
});

export const updateTripSchema = tripBaseSchema.superRefine(validateOdometerRange);

export const updateTripStatusSchema = z.object({
  tripStatus: tripStatusSchema,
});

export const cancelTripSchema = z.object({
  cancellationNotes: z
    .string()
    .trim()
    .min(1, 'Informe a observação do cancelamento.'),
});

export const completeTripSchema = z.object({
  completedAt: z
    .string()
    .trim()
    .min(1, 'Informe a data e hora da conclusão.')
    .refine((value) => !Number.isNaN(new Date(value).getTime()), {
      message: 'Informe uma data e hora de conclusão válida.',
    })
    .transform((value) => new Date(value).toISOString()),
  finalOdometerKm: z
    .union([z.string(), z.number()])
    .transform((v, ctx) => {
      if (typeof v === 'string' && !v.trim()) {
        ctx.addIssue({
          code: 'custom',
          message: 'Informe o KM final da viagem.',
        });
        return z.NEVER;
      }
      const num = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
      if (!Number.isFinite(num) || num < 0) {
        ctx.addIssue({
          code: 'custom',
          message: 'Informe o KM final da viagem.',
        });
        return z.NEVER;
      }
      return num;
    }),
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
  notes: optionalString,
  expenseDate: optionalDate,
  receiptUrl: optionalString,
});

export const updateTripExpenseSchema = z.object({
  id: z.string().uuid(),
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
  notes: optionalString,
  expenseDate: optionalDate,
  receiptUrl: optionalString,
});

export const deleteTripExpenseSchema = z.object({
  id: z.string().uuid(),
  tripId: z.string().uuid(),
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
export type CancelTripInput = z.infer<typeof cancelTripSchema>;
export type CompleteTripInput = z.infer<typeof completeTripSchema>;
export type UploadTripFileInput = z.infer<typeof uploadTripFileSchema>;
export type UpsertTripChecklistInput = z.infer<typeof upsertTripChecklistSchema>;
export type CreateTripOccurrenceInput = z.infer<typeof createTripOccurrenceSchema>;
export type CreateTripExpenseInput = z.infer<typeof createTripExpenseSchema>;
export type UpdateTripExpenseInput = z.infer<typeof updateTripExpenseSchema>;
export type DeleteTripExpenseInput = z.infer<typeof deleteTripExpenseSchema>;
export type CreateTripStopInput = z.infer<typeof createTripStopSchema>;
