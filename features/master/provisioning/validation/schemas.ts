import {z} from 'zod';

import {
  createCompanySchema,
} from '@/features/master/companies/validation/schemas';

export const provisionCompanySchema = createCompanySchema.extend({
  adminName: z.string().trim().min(1, 'Informe o nome do administrador.'),
  adminEmail: z
    .string()
    .trim()
    .min(1, 'Informe o e-mail do administrador.')
    .email('E-mail do administrador inválido.'),
});

export type ProvisionCompanyFormInput = z.infer<typeof provisionCompanySchema>;
