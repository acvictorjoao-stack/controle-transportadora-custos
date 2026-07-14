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
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null) return null;
    const trimmed = v.trim();
    return trimmed.length ? trimmed : null;
  });

const optionalUppercaseString = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null) return null;
    const trimmed = v.trim();
    return trimmed.length ? trimmed.toUpperCase() : null;
  });

const stateRegistrationSchema = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null || !v.length) return null;
    const trimmed = v.trim();
    if (/^ISENTO$/i.test(trimmed)) return 'ISENTO';
    return trimmed.replace(/[^0-9A-Za-z]/g, '').toUpperCase() || null;
  });

const optionalDate = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null) return null;
    const trimmed = v.trim();
    return trimmed.length ? trimmed : null;
  });

const optionalNumber = z
  .union([z.number(), z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null || v === '') return null;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  });

const cnpjSchema = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null || !String(v).trim().length) return null;
    return digitsOnly(String(v));
  })
  .refine((v) => !v || v.length === 14, 'CNPJ inválido.');

const phoneSchema = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null || !String(v).trim().length) return null;
    const digits = digitsOnly(String(v)).slice(0, 11);
    return digits.length ? digits : null;
  })
  .refine((v) => v === null || v.length === 10 || v.length === 11, 'Telefone inválido.');

const zipCodeSchema = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null || !String(v).trim().length) return null;
    const digits = digitsOnly(String(v)).slice(0, 8);
    return digits.length ? digits : null;
  })
  .refine((v) => v === null || v.length === 8, 'CEP inválido.');

export const customerStatusSchema = z.enum(CUSTOMER_STATUSES);
export const customerSegmentSchema = z.enum(CUSTOMER_SEGMENTS);
export const customerAddressTypeSchema = z.enum(CUSTOMER_ADDRESS_TYPES);
export const customerContractStatusSchema = z.enum(CUSTOMER_CONTRACT_STATUSES);
export const customerContractTypeSchema = z.enum(CUSTOMER_CONTRACT_TYPES);
export const customerReadjustmentIndexSchema = z.enum(CUSTOMER_READJUSTMENT_INDICES);

const customerBaseSchema = z.object({
  legalName: z
    .string()
    .trim()
    .min(1, 'Informe a razão social.')
    .transform((v) => v.toUpperCase()),
  tradeName: optionalUppercaseString,
  taxId: cnpjSchema,
  stateRegistration: stateRegistrationSchema,
  municipalRegistration: optionalUppercaseString,
  email: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === null) return null;
      const trimmed = v.trim();
      return trimmed.length ? trimmed : null;
    })
    .refine((v) => !v || z.string().email().safeParse(v).success, 'E-mail inválido.'),
  phone: phoneSchema,
  whatsapp: phoneSchema,
  website: optionalString,
  customerStatus: customerStatusSchema.optional().default('active'),
  segment: customerSegmentSchema.nullable().optional(),
  notes: optionalUppercaseString,
  salesRepresentative: optionalUppercaseString,
  creditLimit: optionalNumber,
  paymentTermDays: optionalNumber,
  branchId: z
    .union([z.string().uuid('Filial inválida.'), z.null()])
    .optional()
    .transform((v) => v ?? null),
});

/** Cadastro simplificado: exige identificação + documento; demais campos opcionais. */
export const createCustomerSchema = customerBaseSchema.extend({
  taxId: cnpjSchema.refine((v) => Boolean(v && v.length === 14), 'Informe um CNPJ válido.'),
});

export const updateCustomerSchema = customerBaseSchema;

export const updateCustomerStatusSchema = z.object({
  customerStatus: customerStatusSchema,
});

export const customerAddressSchema = z.object({
  addressType: customerAddressTypeSchema,
  label: optionalUppercaseString,
  street: optionalUppercaseString,
  number: optionalString,
  complement: optionalUppercaseString,
  neighborhood: optionalUppercaseString,
  city: optionalUppercaseString,
  state: optionalUppercaseString,
  zipCode: zipCodeSchema,
  country: z.string().trim().optional().default('BR'),
  isPrimary: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => v === true || v === 'true' || v === 'on'),
});

export const customerContactSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome do contato.'),
  jobTitle: optionalString,
  phone: phoneSchema,
  whatsapp: phoneSchema,
  email: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === null) return null;
      const trimmed = v.trim();
      return trimmed.length ? trimmed : null;
    })
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
