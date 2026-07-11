import {digitsOnly} from '@/features/master/companies/utils/format';

const DEFAULT_MAX_LENGTH = 14;

/** Maximum length of the numeric/alphanumeric IE value per UF (without formatting). */
const STATE_IE_MAX_LENGTH: Record<string, number> = {
  AC: 13,
  AL: 9,
  AM: 9,
  AP: 9,
  BA: 9,
  CE: 9,
  DF: 13,
  ES: 9,
  GO: 9,
  MA: 9,
  MG: 13,
  MS: 9,
  MT: 11,
  PA: 9,
  PB: 9,
  PE: 9,
  PI: 9,
  PR: 10,
  RJ: 8,
  RN: 10,
  RO: 14,
  RR: 9,
  RS: 10,
  SC: 9,
  SE: 9,
  SP: 12,
  TO: 11,
};

const MASKED_STATES = new Set(['SP', 'RJ', 'MG', 'PR', 'RS']);

export function normalizeUf(state: string | null | undefined): string | null {
  const uf = state?.trim().toUpperCase();
  return uf && uf.length === 2 ? uf : null;
}

export function cleanStateRegistration(value: string): string {
  return value.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
}

function getMaxLength(state: string | null | undefined): number {
  const uf = normalizeUf(state);
  if (!uf) return DEFAULT_MAX_LENGTH;
  return STATE_IE_MAX_LENGTH[uf] ?? DEFAULT_MAX_LENGTH;
}

function applyDigitMask(digits: string, groups: number[], separators: string[]): string {
  let result = '';
  let offset = 0;

  for (let index = 0; index < groups.length; index += 1) {
    const part = digits.slice(offset, offset + groups[index]);
    if (!part) break;
    if (result && separators[index - 1]) {
      result += separators[index - 1];
    }
    result += part;
    offset += groups[index];
  }

  return result;
}

function applyStateMask(uf: string, clean: string): string {
  const digits = digitsOnly(clean);

  switch (uf) {
    case 'SP':
      return applyDigitMask(digits.slice(0, 12), [3, 3, 3, 3], ['.', '.', '.']);
    case 'RJ':
      return applyDigitMask(digits.slice(0, 8), [2, 3, 2], ['.', '.']);
    case 'MG': {
      const value = digits.slice(0, 13);
      if (value.length <= 3) return value;
      if (value.length <= 6) return `${value.slice(0, 3)}.${value.slice(3)}`;
      if (value.length <= 9) return `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6)}`;
      return `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6, 9)}/${value.slice(9)}`;
    }
    case 'PR':
      if (digits.length <= 8) return digits;
      return `${digits.slice(0, 8)}-${digits.slice(8, 10)}`;
    case 'RS':
      if (digits.length <= 3) return digits;
      return `${digits.slice(0, 3)}/${digits.slice(3, 10)}`;
    default:
      return clean.slice(0, getMaxLength(uf));
  }
}

export function parseStateRegistrationInput(
  raw: string,
  state: string | null | undefined,
): string {
  const trimmed = raw.trim();
  if (/^ISENTO$/i.test(trimmed)) {
    return 'ISENTO';
  }

  const clean = cleanStateRegistration(raw);
  if (!clean) return '';

  const uf = normalizeUf(state);
  const maxLength = getMaxLength(uf);

  if (uf && STATE_IE_MAX_LENGTH[uf]) {
    return digitsOnly(clean).slice(0, maxLength);
  }

  return clean.slice(0, maxLength);
}

export function formatStateRegistrationInput(
  value: string | null | undefined,
  state: string | null | undefined,
): string {
  if (!value) return '';
  if (/^ISENTO$/i.test(value)) return 'ISENTO';

  const clean = parseStateRegistrationInput(value, state);
  if (!clean) return '';

  const uf = normalizeUf(state);
  if (uf && MASKED_STATES.has(uf)) {
    return applyStateMask(uf, clean);
  }

  return clean;
}

export function formatStateRegistration(
  value: string | null | undefined,
  state: string | null | undefined,
): string {
  if (!value) return '—';

  const formatted = formatStateRegistrationInput(value, state);
  return formatted || '—';
}
