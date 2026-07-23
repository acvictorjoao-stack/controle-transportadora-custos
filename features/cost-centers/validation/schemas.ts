import {z} from 'zod';

export const costCenterCodeSchema = z
  .string()
  .trim()
  .min(1, 'Informe o código.')
  .max(40, 'Código muito longo.')
  .regex(
    /^[A-Za-z0-9_-]+$/,
    'Use apenas letras, números, hífen ou underscore.',
  )
  .transform((value) => value.toUpperCase());

export const createCostCenterSchema = z.object({
  code: costCenterCodeSchema,
  name: z
    .string()
    .trim()
    .min(1, 'Informe o nome.')
    .transform((value) => value.toUpperCase()),
  description: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v?.length ? v.toUpperCase() : null)),
});

export const updateCostCenterSchema = createCostCenterSchema;

export type CreateCostCenterInput = z.infer<typeof createCostCenterSchema>;
export type UpdateCostCenterInput = z.infer<typeof updateCostCenterSchema>;
