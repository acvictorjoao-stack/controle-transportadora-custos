export type CurrencyCode = 'BRL' | 'USD' | 'EUR';
export type LanguageCode = 'pt-BR' | 'en-US' | 'es-ES';
export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
export type TimeFormat = '24h' | '12h';
export type DistanceUnit = 'km' | 'mi';
export type FuelUnit = 'L' | 'gal';

export interface CompanySettings {
  currency: CurrencyCode;
  language: LanguageCode;
  timezone: string;
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  decimalPlaces: number;
  distanceUnit: DistanceUnit;
  fuelUnit: FuelUnit;
  primaryColor: string;
  secondaryColor: string;
  onboardingCompleted: boolean;
}

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  currency: 'BRL',
  language: 'pt-BR',
  timezone: 'America/Sao_Paulo',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '24h',
  decimalPlaces: 2,
  distanceUnit: 'km',
  fuelUnit: 'L',
  primaryColor: '#2563eb',
  secondaryColor: '#64748b',
  onboardingCompleted: false,
};
