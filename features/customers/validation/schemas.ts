import {z} from 'zod';

import {digitsOnly} from '@/features/master/companies/utils/format';

import {
  CUSTOMER_ADDRESS_TYPES,
  CUSTOMER_CONTRACT_STATUSES,
  CUSTOMER_CONTRACT_TYPES,
  CUSTOMER_DOCUMENT_TYPES,
  CUSTOMER_READJUSTMENT_INDICES,
  CUSTOMER_SEGMENTS,
  CUSTOMER_STATUSES,
} from '../constants/enums';

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v?.length ? v : null));

const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v?.length ? v : null));

const optionalNumber = z
  .union([z.number(), z.string()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null || v === '') return null;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  });

const cnpjSchema = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v?.length ? digitsOnly(v) : null))
  .refine((v) => !v || v.length === 14, 'CNPJ inválido.');

export const customerStatusSchema = z.enum(CUSTOMER_STATUSES);
export const customerSegmentSchema = z.enum(CUSTOMER_SEGMENTS);
export const customerAddressTypeSchema = z.enum(CUSTOMER_ADDRESS_TYPES);
export const customerContractStatusSchema = z.enum(CUSTOMER_CONTRACT_STATUSES);
export const customerContractTypeSchema = z.enum(CUSTOMER_CONTRACT_TYPES);
export const customerReadjustmentIndexSchema = z.enum(CUSTOMER_READJUSTMENT_INDICES);

const customerBaseSchema = z.object({
  legalName: z.string().trim().min(1, 'Informe a razão social.'),
  tradeName: optionalString,
  taxId: cnpjSchema,
  stateRegistration: optionalString,
  municipalRegistration: optionalString,
  email: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v?.length ? v : null))
    .refine((v) => !v || z.string().email().safeParse(v).success, 'E-mail inválido.'),
  phone: optionalString,
  whatsapp: optionalString,
  website: optionalString,
  customerStatus: customerStatusSchema.optional().default('active'),
  segment: customerSegmentSchema.nullable().optional(),
  notes: optionalString,
  salesRepresentative: optionalString,
  creditLimit: optionalNumber,
  paymentTermDays: optionalNumber,
  branchId: z
    .string()
    .uuid('Filial inválida.')
    .nullable()
    .optional()
    .transform((v) => v ?? null),
});

export const createCustomerSchema = customerBaseSchema;
export const updateCustomerSchema = customerBaseSchema;

export const updateCustomerStatusSchema = z.object({
  customerStatus: customerStatusSchema,
});

export const customerAddressSchema = z.object({
  addressType: customerAddressTypeSchema,
  label: optionalString,
  street: optionalString,
  number: optionalString,
  complement: optionalString,
  neighborhood: optionalString,
  city: optionalString,
  state: optionalString,
  zipCode: optionalString,
  country: z.string().trim().optional().default('BR'),
  isPrimary: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => v === true || v === 'true' || v === 'on'),
});

export const customerContactSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome do contato.'),
  jobTitle: optionalString,
  phone: optionalString,
  whatsapp: optionalString,
  email: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v?.length ? v : null))
    .refine((v) => !v || z.string().email().safeParse(v).success, 'E-mail inválido.'),
  isPrimary: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => v === true || v === 'true' || v === 'on'),
});

export const customerContractItemSchema = z.object({
  origin: optionalString,
  destination: optionalString,
  freightValue: optionalNumber,
  minimumValue: optionalNumber,
  weightKg: optionalNumber,
  volumeM3: optionalNumber,
  tollIncluded: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => v === true || v === 'true' || v === 'on'),
  grisPercent: optionalNumber,
  insurancePercent: optionalNumber,
  additionalValue: optionalNumber,
  deliveryDays: optionalNumber,
});

export const createCustomerContractSchema = z.object({
  customerId: z.string().uuid(),
  contractNumber: z.string().trim().min(1, 'Informe o número do contrato.'),
  contractStatus: customerContractStatusSchema.optional().default('draft'),
  startsAt: optionalDate,
  endsAt: optionalDate,
  contractType: customerContractTypeSchema.optional().default('spot'),
  freightTable: optionalString,
  currency: z.string().trim().min(1).optional().default('BRL'),
  notes: optionalString,
  readjustmentIndex: customerReadjustmentIndexSchema.optional().default('none'),
  readjustmentNotes: optionalString,
  items: z.array(customerContractItemSchema).optional().default([]),
});

export const updateCustomerContractSchema = createCustomerContractSchema.omit({customerId: true});

export const uploadCustomerFileSchema = z.object({
  customerId: z.string().uuid(),
  contractId: z.string().uuid().nullable().optional(),
  fileUrl: z.string().url(),
  storagePath: z.string().trim().min(1),
  name: z.string().trim().min(1),
  documentType: z.enum(CUSTOMER_DOCUMENT_TYPES),
  mimeType: z.string().optional().nullable(),
  fileSize: z.number().optional().nullable(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CustomerAddressInput = z.infer<typeof customerAddressSchema>;
export type CustomerContactInput = z.infer<typeof customerContactSchema>;
export type CreateCustomerContractInput = z.infer<typeof createCustomerContractSchema>;
export type UpdateCustomerContractInput = z.infer<typeof updateCustomerContractSchema>;
export type UploadCustomerFileInput = z.infer<typeof uploadCustomerFileSchema>;
