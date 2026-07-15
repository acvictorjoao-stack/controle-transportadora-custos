import type {BadgeProps} from '@/components/ui/badge';

import type {TripStatus} from '../types';
import {TRIP_STATUS_LABELS} from '../types';

export function getTripStatusVariant(status: TripStatus): BadgeProps['variant'] {
  switch (status) {
    case 'completed':
    case 'returned':
      return 'default';
    case 'in_progress':
    case 'delivering':
    case 'loading':
      return 'secondary';
    case 'cancelled':
      return 'destructive';
    case 'waiting':
      return 'outline';
    default:
      return 'outline';
  }
}

export function formatDateTimeBr(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR');
}

export function formatDateBr(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('pt-BR');
}

export function formatDurationHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  return `${hours.toFixed(1)} h`;
}

/** Converte ISO (UTC) → valor de input datetime-local no fuso local. */
export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Converte valor de datetime-local (parede local) → ISO UTC para persistência. */
export function fromDatetimeLocalValue(local: string): string | null {
  if (!local.trim()) return null;
  const date = new Date(local);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export {TRIP_STATUS_LABELS};
