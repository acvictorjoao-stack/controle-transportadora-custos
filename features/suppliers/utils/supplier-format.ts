import {digitsOnly} from '@/features/master/companies/utils/format';

import type {SupplierCategory} from '../types';
import {SUPPLIER_CATEGORY_LABELS} from '../types';

export function formatDocument(document: string | null | undefined, type?: string | null): string {
  if (!document) return '—';
  const digits = digitsOnly(document);
  if (type === 'cpf' || digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (type === 'cnpj' || digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return document;
}

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '—';
  const digits = digitsOnly(phone);
  if (digits.length === 11) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  if (digits.length === 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return phone;
}

export function formatZipCode(zip: string | null | undefined): string {
  if (!zip) return '—';
  const digits = digitsOnly(zip);
  if (digits.length === 8) {
    return digits.replace(/(\d{5})(\d{3})/, '$1-$2');
  }
  return zip;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(value);
}

export function formatDateBr(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('pt-BR');
}

export function formatCategories(categories: SupplierCategory[]): string {
  if (!categories.length) return '—';
  return categories.map((c) => SUPPLIER_CATEGORY_LABELS[c] ?? c).join(', ');
}

export function formatPhoneInput(value: string): string {
  const digits = digitsOnly(value).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function formatZipCodeInput(value: string): string {
  const digits = digitsOnly(value).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function normalizePhoneDigits(value: string): string {
  return digitsOnly(value).slice(0, 11);
}

export function normalizeZipCodeDigits(value: string): string {
  return digitsOnly(value).slice(0, 8);
}

export {VEHICLE_NATIVE_SELECT_CLASS as SUPPLIER_NATIVE_SELECT_CLASS} from '@/features/vehicles/utils/form-styles';
