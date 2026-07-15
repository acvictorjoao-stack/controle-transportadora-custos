import {z} from 'zod';

import {
  ROUTE_OPERATIONAL_STATUSES,
  ROUTE_TYPES,
} from '../constants/enums';

const optionalTrimmedString = z
  .string()
  .trim()
  .nullable()
  .optional()
  .transform((v) => (v?.length ? v : null));

const optionalNonNegativeNumber = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((v) => {
    if (v === null || v === undefined || v === '') return null;
    const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  })
  .refine((v) => v === null || v >= 0, 'Valor inválido.');

export const routeOperationalStatusSchema = z.enum(ROUTE_OPERATIONAL_STATUSES);

export const routeTypeSchema = z.enum(ROUTE_TYPES);

const routeBaseSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome da rota.'),
  code: optionalTrimmedString,
  origin: z.string().trim().min(1, 'Informe a origem.'),
  destination: z.string().trim().min(1, 'Informe o destino.'),
  routeType: routeTypeSchema,
  plannedDistanceKm: optionalNonNegativeNumber,
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
