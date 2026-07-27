import {z} from 'zod';

import {
  ROUTE_OPERATIONAL_STATUSES,
  ROUTE_TYPES,
} from '../constants/enums';

export const LEAD_TIME_REQUIRED_MESSAGE =
  'O Lead Time é obrigatório para que o sistema calcule corretamente: SLA, Atrasos, Chegada prevista, Inteligência Operacional e Indicadores do Dashboard.';

export const UNLOAD_TIME_REQUIRED_MESSAGE =
  'O Tempo de Descarga é obrigatório para que o sistema calcule corretamente a conclusão prevista e os indicadores operacionais.';

const optionalTrimmedString = z
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

const optionalNonNegativeNumber = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((v) => {
    if (v === null || v === undefined || v === '') return null;
    const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  })
  .refine((v) => v === null || v >= 0, 'Valor inválido.');

/** Inteiro positivo (>= 1). Obrigatório no cadastro de rotas (RC 28.0.2). */
function requiredPositiveIntegerMinutes(requiredMessage: string) {
  return z
    .union([z.number(), z.string(), z.null(), z.undefined()])
    .transform((v, ctx) => {
      if (v === null || v === undefined || v === '') {
        ctx.addIssue({code: 'custom', message: requiredMessage});
        return z.NEVER;
      }
      const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
      if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) {
        ctx.addIssue({
          code: 'custom',
          message: 'Informe um número inteiro maior ou igual a 1.',
        });
        return z.NEVER;
      }
      return n;
    });
}

export const routeOperationalStatusSchema = z.enum(ROUTE_OPERATIONAL_STATUSES);

export const routeTypeSchema = z.enum(ROUTE_TYPES);

const routeBaseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Informe o nome da rota.')
    .transform((v) => v.toUpperCase()),
  code: optionalUppercaseString,
  origin: z
    .string()
    .trim()
    .min(1, 'Informe a origem.')
    .transform((v) => v.toUpperCase()),
  destination: z
    .string()
    .trim()
    .min(1, 'Informe o destino.')
    .transform((v) => v.toUpperCase()),
  routeType: routeTypeSchema,
  plannedDistanceKm: optionalNonNegativeNumber,
  leadTimeMinutes: requiredPositiveIntegerMinutes(LEAD_TIME_REQUIRED_MESSAGE),
  unloadTimeMinutes: requiredPositiveIntegerMinutes(UNLOAD_TIME_REQUIRED_MESSAGE),
  notes: optionalTrimmedString,
  operationalStatus: routeOperationalStatusSchema.optional().default('active'),
});

export const createRouteSchema = routeBaseSchema;

export const updateRouteSchema = routeBaseSchema;

export const updateRouteStatusSchema = z.object({
  operationalStatus: routeOperationalStatusSchema,
});

export type CreateRouteInput = z.infer<typeof createRouteSchema>;
export type UpdateRouteInput = z.infer<typeof updateRouteSchema>;
export type UpdateRouteStatusInput = z.infer<typeof updateRouteStatusSchema>;
