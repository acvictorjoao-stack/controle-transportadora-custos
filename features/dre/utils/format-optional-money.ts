import {formatCurrencyBr} from '@/features/financial/utils/financial-format';

/** Formata valor monetário ou "—" quando null (modo só custos / P&L N/A). */
export function formatOptionalMoney(value: number | null | undefined): string {
  if (value == null) return '—';
  return formatCurrencyBr(value);
}

export function optionalResultClass(
  value: number | null | undefined,
): string | undefined {
  if (value == null) return undefined;
  return value < 0 ? 'text-destructive' : undefined;
}
