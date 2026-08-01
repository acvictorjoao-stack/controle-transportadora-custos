import type {ImportPreviewResult, ImportPreviewRow, ImportRowStatus} from './types';

export function normalizeLookupKey(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleUpperCase('pt-BR');
}

export function cellToString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

export function parseOptionalNumber(value: unknown): number | null {
  const raw = cellToString(value);
  if (!raw) return null;
  const n = Number(raw.replace(',', '.'));
  return Number.isFinite(n) ? n : Number.NaN;
}

export function parseOptionalInteger(value: unknown): number | null {
  const n = parseOptionalNumber(value);
  if (n === null) return null;
  if (!Number.isFinite(n) || !Number.isInteger(n)) return Number.NaN;
  return n;
}

export function parseBooleanFlag(value: unknown, defaultValue = true): boolean | null {
  const raw = cellToString(value);
  if (!raw) return defaultValue;
  const normalized = normalizeLookupKey(raw);
  if (['SIM', 'S', 'YES', 'Y', 'TRUE', '1', 'ATIVA', 'ATIVO'].includes(normalized)) {
    return true;
  }
  if (['NAO', 'NÃO', 'N', 'NO', 'FALSE', '0', 'INATIVA', 'INATIVO'].includes(normalized)) {
    return false;
  }
  return null;
}

export function summarizePreviewRows<T>(
  rows: ImportPreviewRow<T>[],
): ImportPreviewResult<T> {
  let validCount = 0;
  let invalidCount = 0;
  let warningCount = 0;

  for (const row of rows) {
    if (row.status === 'valid') validCount += 1;
    else if (row.status === 'invalid') invalidCount += 1;
    else warningCount += 1;
  }

  return {
    rows,
    validCount,
    invalidCount,
    warningCount,
    totalCount: rows.length,
  };
}

export function worstStatus(
  current: ImportRowStatus,
  next: ImportRowStatus,
): ImportRowStatus {
  const rank = {valid: 0, warning: 1, invalid: 2} as const;
  return rank[next] > rank[current] ? next : current;
}
