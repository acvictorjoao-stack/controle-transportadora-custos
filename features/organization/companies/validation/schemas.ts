import {z} from 'zod';

import {digitsOnly} from '@/features/master/companies/utils/format';

const taxIdSchema = z
  .string()
  .trim()
  .min(1, 'Informe o CNPJ.')
  .refine((value) => digitsOnly(value).length === 14, {
    message: 'CNPJ deve conter 14 dígitos.',
  })
  .transform((value) => digitsOnly(value));

const optionalPhoneSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value?.length ? value : null));

export const updateCompanyProfileSchema = z.object({
  legalName: z.string().trim().min(1, 'Informe a razão social.'),
  tradeName: z.string().trim().nullable().optional(),
  taxId: taxIdSchema,
  email: z.string().trim().min(1, 'Informe o e-mail.').email('E-mail inválido.'),
  phone: optionalPhoneSchema,
  whatsapp: optionalPhoneSchema,
  website: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value?.length ? value : null)),
  stateRegistration: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value?.length ? value : null)),
  municipalRegistration: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value?.length ? value : null)),
  addressStreet: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value?.length ? value : null)),
  addressNumber: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value?.length ? value : null)),
  addressComplement: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value?.length ? value : null)),
  addressNeighborhood: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value?.length ? value : null)),
  addressCity: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value?.length ? value : null)),
  addressState: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value?.length ? value : null)),
  addressZip: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value?.length ? digitsOnly(value) : null)),
  addressCountry: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value?.length ? value : 'Brasil')),
});

export type UpdateCompanyProfileInput = z.infer<typeof updateCompanyProfileSchema>;

export const companySettingsSchema = z.object({
  currency: z.enum(['BRL', 'USD', 'EUR']),
  language: z.enum(['pt-BR', 'en-US', 'es-ES']),
  timezone: z.string().trim().min(1, 'Informe o fuso horário.'),
  dateFormat: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']),
  timeFormat: z.enum(['24h', '12h']),
  decimalPlaces: z.coerce.number().int().min(0).max(4),
  distanceUnit: z.enum(['km', 'mi']),
  fuelUnit: z.enum(['L', 'gal']),
  primaryColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida.'),
  secondaryColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida.'),
});

export type CompanySettingsInput = z.infer<typeof companySettingsSchema>;

export const logoUrlSchema = z.object({
  logoUrl: z.string().url('URL da logo inválida.').nullable(),
});

export type LogoUrlInput = z.infer<typeof logoUrlSchema>;
