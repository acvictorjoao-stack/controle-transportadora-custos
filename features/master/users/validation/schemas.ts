import {z} from 'zod';

import {PORTAL_ROLES} from '@/lib/auth/permissions';

const emailSchema = z
  .string()
  .trim()
  .min(1, 'Informe o e-mail.')
  .email('E-mail inválido.');

const fullNameSchema = z
  .string()
  .trim()
  .min(1, 'Informe o nome completo.');

const roleSchema = z.enum([
  PORTAL_ROLES.OWNER,
  PORTAL_ROLES.SUPPORT,
  PORTAL_ROLES.FINANCE,
]);

export const createPortalUserSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  role: roleSchema,
});

export const updatePortalUserSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  role: roleSchema,
});

export const updatePortalUserRoleSchema = z.object({
  role: roleSchema,
});
