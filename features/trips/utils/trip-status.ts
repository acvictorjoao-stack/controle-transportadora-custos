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

export {TRIP_STATUS_LABELS};
