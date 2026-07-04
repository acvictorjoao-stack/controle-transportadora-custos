import {
  DEFAULT_COMPANY_SETTINGS,
  type CompanySettings,
  type CurrencyCode,
  type DateFormat,
  type DistanceUnit,
  type FuelUnit,
  type LanguageCode,
  type TimeFormat,
} from '../types';

function readString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export function mapCompanySettings(raw: unknown): CompanySettings {
  const settings =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

  return {
    currency: readString(settings.currency, DEFAULT_COMPANY_SETTINGS.currency) as CurrencyCode,
    language: readString(settings.language, DEFAULT_COMPANY_SETTINGS.language) as LanguageCode,
    timezone: readString(settings.timezone, DEFAULT_COMPANY_SETTINGS.timezone),
    dateFormat: readString(
      settings.date_format ?? settings.dateFormat,
      DEFAULT_COMPANY_SETTINGS.dateFormat,
    ) as DateFormat,
    timeFormat: readString(
      settings.time_format ?? settings.timeFormat,
      DEFAULT_COMPANY_SETTINGS.timeFormat,
    ) as TimeFormat,
    decimalPlaces: readNumber(
      settings.decimal_places ?? settings.decimalPlaces,
      DEFAULT_COMPANY_SETTINGS.decimalPlaces,
    ),
    distanceUnit: readString(
      settings.distance_unit ?? settings.distanceUnit,
      DEFAULT_COMPANY_SETTINGS.distanceUnit,
    ) as DistanceUnit,
    fuelUnit: readString(
      settings.fuel_unit ?? settings.fuelUnit,
      DEFAULT_COMPANY_SETTINGS.fuelUnit,
    ) as FuelUnit,
    primaryColor: readString(
      settings.primary_color ?? settings.primaryColor,
      DEFAULT_COMPANY_SETTINGS.primaryColor,
    ),
    secondaryColor: readString(
      settings.secondary_color ?? settings.secondaryColor,
      DEFAULT_COMPANY_SETTINGS.secondaryColor,
    ),
    onboardingCompleted: readBoolean(
      settings.onboarding_completed ?? settings.onboardingCompleted,
      DEFAULT_COMPANY_SETTINGS.onboardingCompleted,
    ),
  };
}

export function companySettingsToDb(settings: CompanySettings): Record<string, unknown> {
  return {
    currency: settings.currency,
    language: settings.language,
    timezone: settings.timezone,
    date_format: settings.dateFormat,
    time_format: settings.timeFormat,
    decimal_places: settings.decimalPlaces,
    distance_unit: settings.distanceUnit,
    fuel_unit: settings.fuelUnit,
    primary_color: settings.primaryColor,
    secondary_color: settings.secondaryColor,
    onboarding_completed: settings.onboardingCompleted,
  };
}

export function mergeCompanySettings(
  existing: Record<string, unknown>,
  partial: Partial<CompanySettings>,
): Record<string, unknown> {
  const current = mapCompanySettings(existing);
  const merged: CompanySettings = {...current, ...partial};
  return {...existing, ...companySettingsToDb(merged)};
}
