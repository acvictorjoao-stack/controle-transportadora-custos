import {z} from 'zod';

const optionalUrlSchema = z
  .string()
  .trim()
  .optional()
  .transform((v) => v || null)
  .refine((v) => !v || /^https?:\/\/.+/.test(v), {
    message: 'URL inválida.',
  });

const smtpConfigSchema = z.object({
  host: z.string().trim(),
  port: z.coerce.number().int().min(1).max(65535),
  username: z.string().trim(),
  password: z.string(),
  secure: z.boolean(),
});

const passwordPolicySchema = z.object({
  min_length: z.coerce.number().int().min(6).max(128),
  require_uppercase: z.boolean(),
  require_lowercase: z.boolean(),
  require_number: z.boolean(),
  require_special: z.boolean(),
});

const integrationsSchema = z.object({
  stripe_enabled: z.boolean(),
  webhook_url: z.string().trim(),
  analytics_id: z.string().trim(),
});

const featureFlagsSchema = z.object({
  maintenance_mode: z.boolean(),
  allow_signups: z.boolean(),
  enable_bi: z.boolean(),
  enable_ia: z.boolean(),
});

export const updatePlatformSettingsSchema = z.object({
  platformName: z.string().trim().min(1, 'Informe o nome da plataforma.'),
  logoUrl: optionalUrlSchema,
  faviconUrl: optionalUrlSchema,
  publicUrl: optionalUrlSchema,
  smtpConfig: smtpConfigSchema,
  senderEmail: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || null)
    .refine((v) => !v || z.string().email().safeParse(v).success, {
      message: 'E-mail remetente inválido.',
    }),
  sessionTimeoutMinutes: z.coerce
    .number()
    .int()
    .min(5, 'Mínimo de 5 minutos.')
    .max(10080, 'Máximo de 7 dias.'),
  passwordPolicy: passwordPolicySchema,
  maxUploadMb: z.coerce
    .number()
    .int()
    .min(1, 'Mínimo de 1 MB.')
    .max(500, 'Máximo de 500 MB.'),
  integrations: integrationsSchema,
  featureFlags: featureFlagsSchema,
});
