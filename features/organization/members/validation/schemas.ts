import {z} from 'zod';

const emailSchema = z
  .string()
  .trim()
  .min(1, 'Informe o e-mail.')
  .email('E-mail inválido.');

const fullNameSchema = z
  .string()
  .trim()
  .min(1, 'Informe o nome completo.')
  .max(120, 'Nome muito longo.');

const phoneSchema = z
  .string()
  .trim()
  .max(30, 'Telefone muito longo.')
  .optional()
  .transform((value) => {
    if (!value) return null;
    return value.length > 0 ? value : null;
  });

const roleIdSchema = z
  .string()
  .trim()
  .uuid('Selecione um perfil válido.');

const statusSchema = z.enum(['active', 'inactive']);

export const createMemberSchema = z
  .object({
    fullName: fullNameSchema,
    email: emailSchema,
    phone: phoneSchema,
    roleId: roleIdSchema,
    status: statusSchema.default('active'),
  })
  .strict();

export const updateMemberSchema = z
  .object({
    fullName: fullNameSchema,
    email: emailSchema,
    phone: phoneSchema,
    roleId: roleIdSchema,
    status: statusSchema,
  })
  .strict();

export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
