import {digitsOnly} from '@/features/master/companies/utils/format';

/** Placa antiga: ABC1234 | Mercosul: ABC1D45 — persistência sem hífen. */
const PLATE_RAW_REGEX = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;

/** Caracteres válidos de chassi/VIN (sem I, O, Q). */
const CHASSIS_CHAR_REGEX = /[^A-HJ-NPR-Z0-9]/g;

export function toUpperTrimmed(value: string): string {
  return value.toUpperCase();
}

export function normalizeUpperText(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim().toUpperCase();
  return trimmed.length > 0 ? trimmed : null;
}

/** Extrai placa crua (7 chars alfanuméricos, maiúsculos). */
export function normalizePlate(value: string | null | undefined): string {
  return (value ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 7);
}

export function isValidPlate(value: string | null | undefined): boolean {
  return PLATE_RAW_REGEX.test(normalizePlate(value));
}

/**
 * Máscara de digitação Mercosul/antiga.
 * Exibe: ABC-1234 ou ABC-1D45
 */
export function formatPlateInput(value: string | null | undefined): string {
  const raw = normalizePlate(value);
  if (!raw) return '';
  if (raw.length <= 3) return raw;
  return `${raw.slice(0, 3)}-${raw.slice(3)}`;
}

/** Exibição formatada; retorna "—" se vazio. */
export function formatPlate(value: string | null | undefined): string {
  const formatted = formatPlateInput(value);
  return formatted || '—';
}

export function normalizeRenavam(value: string | null | undefined): string | null {
  const digits = digitsOnly(value ?? '').slice(0, 11);
  return digits.length ? digits : null;
}

export function formatRenavamInput(value: string | null | undefined): string {
  return normalizeRenavam(value) ?? '';
}

export function normalizeChassis(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  const cleaned = value
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(CHASSIS_CHAR_REGEX, '')
    .slice(0, 17);
  return cleaned.length ? cleaned : null;
}

export function formatChassisInput(value: string | null | undefined): string {
  return normalizeChassis(value) ?? '';
}

/** Ano: somente dígitos, máx. 4. */
export function formatYearInput(value: string | null | undefined): string {
  return digitsOnly(value ?? '').slice(0, 4);
}

export function normalizeYear(value: string | number | null | undefined): number | null {
  if (value === undefined || value === null || value === '') return null;
  const digits = typeof value === 'number' ? String(Math.trunc(value)) : formatYearInput(value);
  if (digits.length !== 4) return null;
  const num = Number(digits);
  return Number.isInteger(num) ? num : null;
}

/**
 * Números decimais para digitação (capacidade, peso, tara).
 * Aceita vírgula ou ponto; remove caracteres inválidos.
 */
export function formatDecimalInput(value: string | null | undefined): string {
  if (value === undefined || value === null) return '';
  let cleaned = String(value).replace(/[^\d.,]/g, '');
  cleaned = cleaned.replace(',', '.');
  const firstDot = cleaned.indexOf('.');
  if (firstDot !== -1) {
    cleaned =
      cleaned.slice(0, firstDot + 1) +
      cleaned.slice(firstDot + 1).replace(/\./g, '');
  }
  return cleaned;
}

export function normalizeDecimal(
  value: string | number | null | undefined,
): number | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  const cleaned = formatDecimalInput(value);
  if (!cleaned || cleaned === '.') return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

/** Inteiros positivos (eixos). */
export function formatIntegerInput(value: string | null | undefined): string {
  return digitsOnly(value ?? '');
}

export function normalizeInteger(
  value: string | number | null | undefined,
): number | null {
  if (value === undefined || value === null || value === '') return null;
  const digits =
    typeof value === 'number' ? String(Math.trunc(value)) : formatIntegerInput(value);
  if (!digits) return null;
  const num = Number(digits);
  return Number.isInteger(num) && num > 0 ? num : null;
}

/** Hodômetro: somente dígitos (inteiros ≥ 0). */
export function formatOdometerInput(value: string | null | undefined): string {
  return digitsOnly(value ?? '');
}

export function normalizeOdometer(
  value: string | number | null | undefined,
  fallback = 0,
): number {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? Math.trunc(value) : fallback;
  }
  const digits = formatOdometerInput(value);
  if (!digits) return fallback;
  const num = Number(digits);
  return Number.isFinite(num) && num >= 0 ? num : fallback;
}
