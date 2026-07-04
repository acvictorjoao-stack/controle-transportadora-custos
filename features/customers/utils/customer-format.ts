import type {CustomerContractStatus, CustomerStatus} from '../types';

export function formatCnpj(value: string | null): string {
  if (!value) return '—';
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 14) return value;
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
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
