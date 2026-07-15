import {z} from 'zod';

import {digitsOnly} from '@/features/master/companies/utils/format';

const optionalTaxIdSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => {
    if (!value?.length) return null;
    const digits = digitsOnly(value);
    return digits.length ? digits : null;
  })
  .refine((value) => value === null || value.length === 14, 'CNPJ inválido.');

export const branchCodeSchema = z
  .string()
  .trim()
  .min(1, 'Informe o código.')
  .max(20, 'Código muito longo.')
  .regex(/^[A-Za-z0-9_-]+$/, 'Use apenas letras, números, hífen ou underscore.')
  .transform((value) => value.toUpperCase());

export const createBranchSchema = z.object({
  code: branchCodeSchema,
  name: z
    .string()
    .trim()
    .min(1, 'Informe o nome.')
    .transform((value) => value.toUpperCase()),
  taxId: optionalTaxIdSchema,
  addressStreet: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v?.length ? v.toUpperCase() : null)),
  phone: z
    .string()
    .trim()
    .optional()
    .transform((v) => {
      if (!v?.length) return null;
      const digits = digitsOnly(v).slice(0, 11);
      return digits.length ? digits : null;
    })
    .refine(
      (v) => v === null || v.length === 10 || v.length === 11,
      'Telefone inválido.',
    ),
  responsibleName: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v?.length ? v.toUpperCase() : null)),
  isHeadquarters: z.boolean().optional().default(false),
});

export const updateBranchSchema = createBranchSchema.extend({
  status: z.enum(['active', 'inactive', 'blocked', 'archived']).optional(),
});

export type CreateBranchInput = z.infer<typeof createBranchSchema>;
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
