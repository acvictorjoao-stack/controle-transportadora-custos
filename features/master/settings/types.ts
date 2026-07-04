export interface PasswordPolicy {
  min_length: number;
  require_uppercase: boolean;
  require_lowercase: boolean;
  require_number: boolean;
  require_special: boolean;
}

export interface SmtpConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  secure: boolean;
}

export interface PlatformIntegrations {
  stripe_enabled: boolean;
  webhook_url: string;
  analytics_id: string;
}

export interface FeatureFlags {
  maintenance_mode: boolean;
  allow_signups: boolean;
  enable_bi: boolean;
  enable_ia: boolean;
}

export interface PlatformSettings {
  id: string;
  platformName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  publicUrl: string | null;
  smtpConfig: SmtpConfig;
  senderEmail: string | null;
  sessionTimeoutMinutes: number;
  passwordPolicy: PasswordPolicy;
  maxUploadMb: number;
  integrations: PlatformIntegrations;
  featureFlags: FeatureFlags;
  updatedAt: string;
}

export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  min_length: 8,
  require_uppercase: true,
  require_lowercase: true,
  require_number: true,
  require_special: false,
};

export const DEFAULT_SMTP_CONFIG: SmtpConfig = {
  host: '',
  port: 587,
  username: '',
  password: '',
  secure: true,
};

export const DEFAULT_INTEGRATIONS: PlatformIntegrations = {
  stripe_enabled: false,
  webhook_url: '',
  analytics_id: '',
};

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  maintenance_mode: false,
  allow_signups: true,
  enable_bi: false,
  enable_ia: false,
};
