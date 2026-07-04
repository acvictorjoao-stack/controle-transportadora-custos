import type {SupabaseClient} from '@supabase/supabase-js';

import {
  DEFAULT_FEATURE_FLAGS,
  DEFAULT_INTEGRATIONS,
  DEFAULT_PASSWORD_POLICY,
  DEFAULT_SMTP_CONFIG,
  type FeatureFlags,
  type PasswordPolicy,
  type PlatformIntegrations,
  type PlatformSettings,
  type SmtpConfig,
} from '../types';

interface PlatformSettingsRow {
  id: string;
  platform_name: string;
  logo_url: string | null;
  favicon_url: string | null;
  public_url: string | null;
  smtp_config: Record<string, unknown>;
  sender_email: string | null;
  session_timeout_minutes: number;
  password_policy: Record<string, unknown>;
  max_upload_mb: number;
  integrations: Record<string, unknown>;
  feature_flags: Record<string, unknown>;
  updated_at: string;
}

function parseSmtpConfig(raw: Record<string, unknown>): SmtpConfig {
  return {
    host: typeof raw.host === 'string' ? raw.host : DEFAULT_SMTP_CONFIG.host,
    port: typeof raw.port === 'number' ? raw.port : DEFAULT_SMTP_CONFIG.port,
    username:
      typeof raw.username === 'string' ? raw.username : DEFAULT_SMTP_CONFIG.username,
    password:
      typeof raw.password === 'string' ? raw.password : DEFAULT_SMTP_CONFIG.password,
    secure: typeof raw.secure === 'boolean' ? raw.secure : DEFAULT_SMTP_CONFIG.secure,
  };
}

function parsePasswordPolicy(raw: Record<string, unknown>): PasswordPolicy {
  return {
    min_length:
      typeof raw.min_length === 'number'
        ? raw.min_length
        : DEFAULT_PASSWORD_POLICY.min_length,
    require_uppercase:
      typeof raw.require_uppercase === 'boolean'
        ? raw.require_uppercase
        : DEFAULT_PASSWORD_POLICY.require_uppercase,
    require_lowercase:
      typeof raw.require_lowercase === 'boolean'
        ? raw.require_lowercase
        : DEFAULT_PASSWORD_POLICY.require_lowercase,
    require_number:
      typeof raw.require_number === 'boolean'
        ? raw.require_number
        : DEFAULT_PASSWORD_POLICY.require_number,
    require_special:
      typeof raw.require_special === 'boolean'
        ? raw.require_special
        : DEFAULT_PASSWORD_POLICY.require_special,
  };
}

function parseIntegrations(raw: Record<string, unknown>): PlatformIntegrations {
  return {
    stripe_enabled:
      typeof raw.stripe_enabled === 'boolean'
        ? raw.stripe_enabled
        : DEFAULT_INTEGRATIONS.stripe_enabled,
    webhook_url:
      typeof raw.webhook_url === 'string'
        ? raw.webhook_url
        : DEFAULT_INTEGRATIONS.webhook_url,
    analytics_id:
      typeof raw.analytics_id === 'string'
        ? raw.analytics_id
        : DEFAULT_INTEGRATIONS.analytics_id,
  };
}

function parseFeatureFlags(raw: Record<string, unknown>): FeatureFlags {
  return {
    maintenance_mode:
      typeof raw.maintenance_mode === 'boolean'
        ? raw.maintenance_mode
        : DEFAULT_FEATURE_FLAGS.maintenance_mode,
    allow_signups:
      typeof raw.allow_signups === 'boolean'
        ? raw.allow_signups
        : DEFAULT_FEATURE_FLAGS.allow_signups,
    enable_bi:
      typeof raw.enable_bi === 'boolean'
        ? raw.enable_bi
        : DEFAULT_FEATURE_FLAGS.enable_bi,
    enable_ia:
      typeof raw.enable_ia === 'boolean'
        ? raw.enable_ia
        : DEFAULT_FEATURE_FLAGS.enable_ia,
  };
}

function mapSettingsRow(row: PlatformSettingsRow): PlatformSettings {
  return {
    id: row.id,
    platformName: row.platform_name,
    logoUrl: row.logo_url,
    faviconUrl: row.favicon_url,
    publicUrl: row.public_url,
    smtpConfig: parseSmtpConfig(row.smtp_config),
    senderEmail: row.sender_email,
    sessionTimeoutMinutes: row.session_timeout_minutes,
    passwordPolicy: parsePasswordPolicy(row.password_policy),
    maxUploadMb: row.max_upload_mb,
    integrations: parseIntegrations(row.integrations),
    featureFlags: parseFeatureFlags(row.feature_flags),
    updatedAt: row.updated_at,
  };
}

export async function getPlatformSettings(
  supabase: SupabaseClient,
): Promise<PlatformSettings> {
  const {data, error} = await supabase
    .from('platform_settings')
    .select('*')
    .eq('id', 'default')
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('Configurações da plataforma não encontradas.');
  }

  return mapSettingsRow(data as unknown as PlatformSettingsRow);
}

export async function updatePlatformSettings(
  supabase: SupabaseClient,
  input: {
    platform_name: string;
    logo_url: string | null;
    favicon_url: string | null;
    public_url: string | null;
    smtp_config: SmtpConfig;
    sender_email: string | null;
    session_timeout_minutes: number;
    password_policy: PasswordPolicy;
    max_upload_mb: number;
    integrations: PlatformIntegrations;
    feature_flags: FeatureFlags;
  },
): Promise<PlatformSettings> {
  const {data, error} = await supabase
    .from('platform_settings')
    .update(input)
    .eq('id', 'default')
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapSettingsRow(data as unknown as PlatformSettingsRow);
}
