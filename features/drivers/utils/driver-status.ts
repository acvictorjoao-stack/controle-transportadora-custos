import {digitsOnly} from '@/features/master/companies/utils/format';

import type {DriverOperationalStatus} from '../types';

export function getDriverOperationalStatusVariant(
  status: DriverOperationalStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'active':
      return 'default';
    case 'inactive':
      return 'secondary';
    default:
      return 'outline';
  }
}

export function isCnhExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(expiresAt) < today;
}

export function isCnhExpiring(expiresAt: string | null, days = 30): boolean {
  if (!expiresAt) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limit = new Date(today);
  limit.setDate(limit.getDate() + days);
  const expiry = new Date(expiresAt);
  return expiry >= today && expiry <= limit;
}

export function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

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

export function formatZipCode(value: string | null | undefined): string {
  const clean = digitsOnly(value ?? '').slice(0, 8);
  if (!clean) return '—';
  if (clean.length <= 5) return clean;
  return `${clean.slice(0, 5)}-${clean.slice(5)}`;
}

export interface EmergencyContactParts {
  name: string | null;
  phone: string | null;
}

export function splitEmergencyContact(value: string | null | undefined): EmergencyContactParts {
  const raw = value?.trim();
  if (!raw) {
    return {name: null, phone: null};
  }

  const digits = digitsOnly(raw).slice(0, 11);
  if (digits.length === 10 || digits.length === 11) {
    return {name: null, phone: digits};
  }

  const pipeIndex = raw.lastIndexOf('|');
  if (pipeIndex >= 0) {
    const name = raw.slice(0, pipeIndex).trim() || null;
    const phoneDigits = digitsOnly(raw.slice(pipeIndex + 1)).slice(0, 11);
    return {
      name,
      phone: phoneDigits.length ? phoneDigits : null,
    };
  }

  return {name: raw, phone: null};
}

export function buildEmergencyContact(name: string | null | undefined, phone: string | null | undefined): string | null {
  const normalizedName = name?.trim() || null;
  const normalizedPhone = digitsOnly(phone ?? '').slice(0, 11) || null;

  if (!normalizedName && !normalizedPhone) {
    return null;
  }

  if (!normalizedName) {
    return normalizedPhone;
  }

  if (!normalizedPhone) {
    return normalizedName;
  }

  return `${normalizedName} | ${normalizedPhone}`;
}

export function formatDateBr(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('pt-BR');
}
