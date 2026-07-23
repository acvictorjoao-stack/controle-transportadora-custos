import {z} from 'zod';

import {OPERATION_PAYMENT_TYPES} from '@/features/financial/constants/operation-financial';

import {
  MAINTENANCE_DOCUMENT_TYPES,
  MAINTENANCE_PRIORITIES,
  MAINTENANCE_STATUSES,
  MAINTENANCE_TYPES,
} from '../constants/enums';

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

const nonNegativeNumber = z
  .union([z.number(), z.string()])
  .nullish()
  .transform((v) => {
    if (v === undefined || v === null || v === '') return null;
    const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
    return Number.isFinite(n) && n >= 0 ? n : null;
  });

export const maintenanceTypeSchema = z.enum(MAINTENANCE_TYPES);
export const maintenancePrioritySchema = z.enum(MAINTENANCE_PRIORITIES);
export const maintenanceStatusSchema = z.enum(MAINTENANCE_STATUSES);

const maintenanceBaseSchema = z
  .object({
    vehicleId: z.string().uuid('Veículo inválido.'),
    driverId: z
      .string()
      .uuid('Motorista inválido.')
      .nullable()
      .optional()
      .transform((v) => v ?? null),
    tripId: z
      .string()
      .uuid('Viagem inválida.')
      .nullable()
      .optional()
      .transform((v) => v ?? null),
    branchId: z
      .string()
      .uuid('Filial inválida.')
      .nullable()
      .optional()
      .transform((v) => v ?? null),
    maintenanceType: maintenanceTypeSchema,
    priority: maintenancePrioritySchema.default('medium'),
    maintenanceStatus: maintenanceStatusSchema.default('open'),
    supplier: optionalString,
    workshop: optionalString,
    openedAt: z.string().trim().min(1, 'Informe a data de abertura.'),
    completedAt: optionalString,
    odometerKm: optionalNumber,
    hourMeter: optionalNumber,
    description: optionalString,
    diagnosis: optionalString,
    solution: optionalString,
    notes: optionalString,
    estimatedAmount: nonNegativeNumber,
    finalAmount: nonNegativeNumber,
    responsible: optionalString,
    paymentType: z.enum(OPERATION_PAYMENT_TYPES).default('cash'),
    paymentDueDate: optionalString,
  })
  .superRefine((data, ctx) => {
    if (data.paymentType === 'credit' && !data.paymentDueDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['paymentDueDate'],
        message: 'Informe o vencimento para pagamento a prazo.',
      });
    }
  });

export const createMaintenanceRecordSchema = maintenanceBaseSchema;
export const updateMaintenanceRecordSchema = maintenanceBaseSchema;

export const uploadMaintenanceFileSchema = z.object({
  maintenanceRecordId: z.string().uuid(),
  fileUrl: z.string().url(),
  storagePath: z.string().trim().min(1),
  name: z.string().trim().min(1),
  documentType: z.enum(MAINTENANCE_DOCUMENT_TYPES),
  mimeType: z.string().optional().nullable(),
  fileSize: z.number().optional().nullable(),
});

export const createMaintenancePartSchema = z.object({
  maintenanceRecordId: z.string().uuid(),
  name: z.string().trim().min(1, 'Informe o nome da peça.'),
  code: optionalString,
  quantity: z
    .union([z.number(), z.string()])
    .transform((v) => {
      const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
      return n;
    })
    .refine((v) => Number.isFinite(v) && v > 0, 'Quantidade inválida.'),
  unitPrice: nonNegativeNumber.refine((v) => v !== null, 'Informe o valor unitário.'),
  supplier: optionalString,
  warrantyUntil: optionalString,
});

export const updateMaintenancePartSchema = createMaintenancePartSchema.omit({
  maintenanceRecordId: true,
});

export const createMaintenanceServiceSchema = z.object({
  maintenanceRecordId: z.string().uuid(),
  description: z.string().trim().min(1, 'Informe a descrição do serviço.'),
  hours: optionalNumber,
  amount: nonNegativeNumber.refine((v) => v !== null, 'Informe o valor.'),
  responsible: optionalString,
});

export const updateMaintenanceServiceSchema = createMaintenanceServiceSchema.omit({
  maintenanceRecordId: true,
});

export type CreateMaintenanceRecordInput = z.infer<typeof createMaintenanceRecordSchema>;
export type UpdateMaintenanceRecordInput = z.infer<typeof updateMaintenanceRecordSchema>;
export type UploadMaintenanceFileInput = z.infer<typeof uploadMaintenanceFileSchema>;
export type CreateMaintenancePartInput = z.infer<typeof createMaintenancePartSchema>;
export type UpdateMaintenancePartInput = z.infer<typeof updateMaintenancePartSchema>;
export type CreateMaintenanceServiceInput = z.infer<typeof createMaintenanceServiceSchema>;
export type UpdateMaintenanceServiceInput = z.infer<typeof updateMaintenanceServiceSchema>;
