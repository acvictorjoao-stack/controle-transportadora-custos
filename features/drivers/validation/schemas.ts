import {z} from 'zod';

import {digitsOnly} from '@/features/master/companies/utils/format';

import {
  DRIVER_CONTRACT_TYPES,
  DRIVER_DOCUMENT_TYPES,
  DRIVER_LICENSE_CATEGORIES,
  DRIVER_OPERATIONAL_STATUSES,
} from '../constants/enums';

const optionalString = z
  .string()
  .trim()
  .nullable()
  .optional()
  .transform((v) => (v?.length ? v : null));

const optionalDate = z
  .string()
  .trim()
  .nullable()
  .optional()
  .transform((v) => (v?.length ? v : null));

const optionalUppercaseString = z
  .string()
  .trim()
  .nullable()
  .optional()
  .transform((v) => (v?.length ? v.toUpperCase() : null));

const optionalRgString = z
  .string()
  .trim()
  .nullable()
  .optional()
  .transform((v) => {
    if (!v?.length) return null;
    // Some RGs can include letters; normalize only when letters exist.
    return /[A-Za-z]/.test(v) ? v.toUpperCase() : v;
  });

const phoneSchema = z
  .string()
  .trim()
  .nullable()
  .optional()
  .transform((v) => {
    if (!v?.length) return null;
    const digits = digitsOnly(v);
    return digits.length ? digits : null;
  })
  .refine((v) => v === null || v.length === 10 || v.length === 11, 'Telefone inválido.');

const cpfSchema = z
  .string()
  .trim()
  .min(1, 'Informe o CPF.')
  .transform((v) => digitsOnly(v))
  .refine((v) => v.length === 11, 'CPF inválido.');

const cnhSchema = z
  .string()
  .trim()
  .min(1, 'Informe o número da CNH.')
  .max(20, 'CNH inválida.');

export const driverOperationalStatusSchema = z.enum(DRIVER_OPERATIONAL_STATUSES);

export const driverLicenseCategorySchema = z.enum(DRIVER_LICENSE_CATEGORIES);

export const driverContractTypeSchema = z.enum(DRIVER_CONTRACT_TYPES);

const driverBaseSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome.').transform((v) => v.toUpperCase()),
  cpf: cpfSchema,
  rg: optionalRgString,
  cnhNumber: cnhSchema,
  licenseCategory: driverLicenseCategorySchema,
  licenseIssuedAt: optionalDate,
  licenseExpiresAt: optionalDate,
  ear: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => v === true || v === 'true' || v === 'on'),
  birthDate: optionalDate,
  phone: phoneSchema,
  whatsapp: phoneSchema,
  email: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((v) => (v?.length ? v : null))
    .refine((v) => !v || z.string().email().safeParse(v).success, 'E-mail inválido.'),
  address: optionalUppercaseString,
  zipCode: optionalString,
  city: optionalUppercaseString,
  state: optionalUppercaseString,
  notes: optionalUppercaseString,
  operationalStatus: driverOperationalStatusSchema.optional().default('active'),
  hiredAt: optionalDate,
  terminatedAt: optionalDate,
  contractType: driverContractTypeSchema.nullable().optional(),
  emergencyContact: optionalUppercaseString,
  branchId: z
    .string()
    .uuid('Filial inválida.')
    .nullable()
    .optional()
    .transform((v) => v ?? null),
});

export const createDriverSchema = driverBaseSchema;

export const updateDriverSchema = driverBaseSchema;

export const updateDriverStatusSchema = z.object({
  operationalStatus: driverOperationalStatusSchema,
});

export const uploadDriverFileSchema = z.object({
  driverId: z.string().uuid(),
  fileUrl: z.string().url(),
  storagePath: z.string().trim().min(1),
  name: z.string().trim().min(1),
  documentType: z.enum(DRIVER_DOCUMENT_TYPES),
  mimeType: z.string().optional().nullable(),
  fileSize: z.number().optional().nullable(),
});

export type CreateDriverInput = z.infer<typeof createDriverSchema>;
export type UpdateDriverInput = z.infer<typeof updateDriverSchema>;
export type UpdateDriverStatusInput = z.infer<typeof updateDriverStatusSchema>;
export type UploadDriverFileInput = z.infer<typeof uploadDriverFileSchema>;
