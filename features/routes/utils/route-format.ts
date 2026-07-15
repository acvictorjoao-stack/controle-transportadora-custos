import type {RouteOperationalStatus} from '../types';

export function getRouteOperationalStatusVariant(
  status: RouteOperationalStatus,
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

export function formatDistanceKm(value: number | null): string {
  if (value === null || value === undefined) return '—';
  return `${value.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} km`;
}

export function formatDurationMinutes(totalMinutes: number | null): string {
  if (totalMinutes === null || totalMinutes === undefined) return '—';
  if (totalMinutes < 0) return '—';

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes}min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}min`;
}

export function splitDurationMinutes(totalMinutes: number | null): {
  hours: string;
  minutes: string;
} {
  if (totalMinutes === null || totalMinutes === undefined || totalMinutes < 0) {
    return {hours: '', minutes: ''};
  }
  return {
    hours: String(Math.floor(totalMinutes / 60)),
    minutes: String(totalMinutes % 60),
  };
}

export function combineDurationToMinutes(
  hours: string | number | null | undefined,
  minutes: string | number | null | undefined,
): number | null {
  const h = hours === '' || hours === null || hours === undefined ? 0 : Number(hours);
  const m =
    minutes === '' || minutes === null || minutes === undefined ? 0 : Number(minutes);

  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  if (h === 0 && m === 0 && (hours === '' || hours == null) && (minutes === '' || minutes == null)) {
    return null;
  }

  return Math.max(0, Math.round(h) * 60 + Math.max(0, Math.round(m)));
}
