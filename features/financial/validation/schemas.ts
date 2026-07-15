import {z} from 'zod';

import {
  FINANCIAL_DOCUMENT_TYPES,
  FINANCIAL_ENTRY_STATUSES,
  FINANCIAL_ENTRY_TYPES,
} from '../constants/enums';

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v?.length ? v : null));

const optionalUuid = z
  .string()
  .uuid()
  .nullable()
  .optional()
  .transform((v) => v ?? null);

const requiredAmount = z
  .union([z.number(), z.string()])
  .transform((v) => {
    const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
    return n;
  })
  .refine((v) => Number.isFinite(v) && v >= 0, 'Informe um valor válido.');

const financialBaseSchema = z.object({
  branchId: optionalUuid,
  vehicleId: optionalUuid,
  driverId: optionalUuid,
  tripId: optionalUuid,
  categoryId: optionalUuid,
  costCenterId: optionalUuid,
  entryType: z.enum(FINANCIAL_ENTRY_TYPES),
  entryStatus: z.enum(FINANCIAL_ENTRY_STATUSES).optional().default('pending'),
  description: optionalString,
  referenceNumber: optionalString,
  supplier: optionalString,
  client: optionalString,
  amount: requiredAmount,
  currency: z.string().trim().min(1).optional().default('BRL'),
  entryDate: z.string().trim().min(1, 'Informe a data do lançamento.'),
  dueDate: optionalString,
  notes: optionalString,
});

export const createFinancialEntrySchema = financialBaseSchema;

export const updateFinancialEntrySchema = financialBaseSchema;

export const markFinancialEntryPaidSchema = z.object({
  paidAt: z.string().trim().min(1).optional(),
  paidAmount: requiredAmount.optional(),
});

export const reverseFinancialEntrySchema = z.object({
  reason: optionalString,
});

export const uploadFinancialFileSchema = z.object({
  financialEntryId: z.string().uuid(),
  fileUrl: z.string().url(),
  storagePath: z.string().trim().min(1),
  name: z.string().trim().min(1),
  documentType: z.enum(FINANCIAL_DOCUMENT_TYPES),
  mimeType: z.string().optional().nullable(),
  fileSize: z.number().optional().nullable(),
});

export type CreateFinancialEntryInput = z.infer<typeof createFinancialEntrySchema>;
export type UpdateFinancialEntryInput = z.infer<typeof updateFinancialEntrySchema>;
export type MarkFinancialEntryPaidInput = z.infer<typeof markFinancialEntryPaidSchema>;
export type UploadFinancialFileInput = z.infer<typeof uploadFinancialFileSchema>;
