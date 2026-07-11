import {digitsOnly, formatTaxId} from '@/features/master/companies/utils/format';

import type {CustomerContractStatus, CustomerStatus} from '../types';

export function formatPhone(value: string | null | undefined): string {
  const clean = digitsOnly(value ?? '');
  if (!clean) return '—';

  const ddd = clean.slice(0, 2);
  const rest = clean.slice(2);
  const isElevenDigits = clean.length > 10;

  if (clean.length <= 2) return `(${ddd}`;

  if (!isElevenDigits) {
    const part1 = rest.slice(0, 4);
    const part2 = rest.slice(4, 8);
    return `(${ddd}) ${part1}${part2 ? `-${part2}` : ''}`;
  }

  const part1 = rest.slice(0, 5);
  const part2 = rest.slice(5, 9);
  return `(${ddd}) ${part1}${part2 ? `-${part2}` : ''}`;
}

export function formatPhoneInput(value: string | null | undefined): string {
  const formatted = formatPhone(value);
  return formatted === '—' ? '' : formatted;
}

export function formatZipCode(value: string | null | undefined): string {
  const clean = digitsOnly(value ?? '').slice(0, 8);
  if (!clean) return '—';
  if (clean.length <= 5) return clean;
  return `${clean.slice(0, 5)}-${clean.slice(5)}`;
}

export function formatZipCodeInput(value: string | null | undefined): string {
  const formatted = formatZipCode(value);
  return formatted === '—' ? '' : formatted;
}

export function normalizePhoneDigits(value: string | null | undefined): string | null {
  const digits = digitsOnly(value ?? '').slice(0, 11);
  return digits.length ? digits : null;
}

export function normalizeZipCodeDigits(value: string | null | undefined): string | null {
  const digits = digitsOnly(value ?? '').slice(0, 8);
  return digits.length ? digits : null;
}

export function formatCnpj(value: string | null): string {
  if (!value) return '—';
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (!digits) return '—';
  return formatTaxId(digits);
}

export function formatCurrency(value: number | null, currency = 'BRL'): string {
  if (value === null) return '—';
  return new Intl.NumberFormat('pt-BR', {style: 'currency', currency}).format(value);
}

export function formatDateBr(value: string | null): string {
  if (!value) return '—';
  const date = value.slice(0, 10);
  const [y, m, d] = date.split('-');
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

export function getCustomerStatusVariant(
  status: CustomerStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'active':
      return 'default';
    case 'prospect':
      return 'outline';
    case 'blocked':
      return 'destructive';
    default:
      return 'secondary';
  }
}

export function getContractStatusVariant(
  status: CustomerContractStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'active':
      return 'default';
    case 'draft':
      return 'outline';
    case 'suspended':
    case 'expired':
    case 'cancelled':
      return 'destructive';
    default:
      return 'secondary';
  }
}

export function isContractExpiring(endsAt: string | null, days = 30): boolean {
  if (!endsAt) return false;
  const end = new Date(endsAt.slice(0, 10));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limit = new Date(today);
  limit.setDate(limit.getDate() + days);
  return end >= today && end <= limit;
}

export function isContractExpired(endsAt: string | null): boolean {
  if (!endsAt) return false;
  const end = new Date(endsAt.slice(0, 10));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return end < today;
}
