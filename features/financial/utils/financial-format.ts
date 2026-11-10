import {formatDate, formatDateTime} from '@/lib/formatting/date';

export function formatCurrencyBr(value: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(value);
}

export function formatDateBr(value: string | null): string {
  return formatDate(value);
}

export function formatDateTimeBr(value: string | null): string {
  return formatDateTime(value);
}

export function formatPercent(value: number): string {
  return `${value.toLocaleString('pt-BR', {minimumFractionDigits: 1, maximumFractionDigits: 1})}%`;
}
