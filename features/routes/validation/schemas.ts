import {z} from 'zod';

import {
  ROUTE_OPERATIONAL_STATUSES,
  ROUTE_TYPES,
} from '../constants/enums';
import {buildAutoRouteName} from '../utils/route-format';

export const LEAD_TIME_REQUIRED_MESSAGE =
  'O Lead Time é obrigatório para que o sistema calcule corretamente: SLA, Atrasos, Chegada prevista, Inteligência Operacional e Indicadores do Dashboard.';

export const LEAD_TIME_DAYS_HINT =
  'Tempo previsto entre a saída da origem e a chegada ao destino.';

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

const optionalUuid = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => {
    if (v === null || v === undefined || v === '') return null;
    return v;
  })
  .refine(
    (v) => v === null || z.string().uuid().safeParse(v).success,
    'Seleção inválida.',
  );

/** Inteiro positivo (>= 1) em dias. */
function requiredPositiveIntegerDays(requiredMessage: string) {
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
          message: 'Lead Time deve ser maior que zero.',
        });
        return z.NEVER;
      }
      return n;
    });
}

export const routeOperationalStatusSchema = z.enum(ROUTE_OPERATIONAL_STATUSES);

export const routeTypeSchema = z.enum(ROUTE_TYPES);

const routeBaseSchema = z
  .object({
    name: z
      .union([z.string(), z.null(), z.undefined()])
      .transform((v) => (typeof v === 'string' ? v.trim() : ''))
      .refine((v) => v.length <= 150, 'Nome da Rota deve ter no máximo 150 caracteres.'),
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
    routeType: routeTypeSchema.optional().default('delivery'),
    plannedDistanceKm: optionalNonNegativeNumber,
    leadTimeDays: requiredPositiveIntegerDays(LEAD_TIME_REQUIRED_MESSAGE),
    customerId: optionalUuid.refine((v) => v != null, 'Informe o cliente.'),
    branchId: optionalUuid.refine((v) => v != null, 'Informe a filial.'),
    notes: optionalTrimmedString,
    operationalStatus: routeOperationalStatusSchema.optional().default('active'),
  })
  .transform((data) => ({
    ...data,
    name: data.name.length > 0 ? data.name : buildAutoRouteName(data.origin, data.destination),
    customerId: data.customerId as string,
    branchId: data.branchId as string,
  }));

export const createRouteSchema = routeBaseSchema;

export const updateRouteSchema = routeBaseSchema;

export const updateRouteStatusSchema = z.object({
  operationalStatus: routeOperationalStatusSchema,
});

export type CreateRouteInput = z.infer<typeof createRouteSchema>;
export type UpdateRouteInput = z.infer<typeof updateRouteSchema>;
export type UpdateRouteStatusInput = z.infer<typeof updateRouteStatusSchema>;
