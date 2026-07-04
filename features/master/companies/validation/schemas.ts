import {z} from 'zod';



import {digitsOnly, slugify} from '../utils/format';



const slugSchema = z

  .string()

  .trim()

  .min(1, 'Informe o slug.')

  .regex(

    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,

    'Use apenas letras minúsculas, números e hífens.',

  );



const taxIdSchema = z

  .string()

  .trim()

  .min(1, 'Informe o CNPJ.')

  .refine((value) => digitsOnly(value).length === 14, {

    message: 'CNPJ deve conter 14 dígitos.',

  })

  .transform((value) => digitsOnly(value));



const emailSchema = z

  .string()

  .trim()

  .min(1, 'Informe o e-mail.')

  .email('E-mail inválido.');



export const createCompanySchema = z.object({

  legalName: z.string().trim().min(1, 'Informe o nome.'),

  tradeName: z.string().trim().optional(),

  taxId: taxIdSchema,

  email: emailSchema,

  phone: z.string().trim().optional(),

  slug: slugSchema,

  planSlug: z.string().trim().min(1).optional().default('free'),

});



export const updateCompanySchema = z.object({

  legalName: z.string().trim().min(1, 'Informe o nome.'),

  tradeName: z.string().trim().nullable().optional(),

  slug: slugSchema,

  email: emailSchema,

  phone: z.string().trim().nullable().optional(),

  status: z.enum(['active', 'inactive', 'blocked', 'archived']),

  planSlug: z.string().trim().min(1).optional(),

  notes: z.string().trim().nullable().optional(),

});



export type CreateCompanyInput = z.infer<typeof createCompanySchema>;

export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;



export function normalizeSlugInput(value: string): string {

  return slugify(value);

}

