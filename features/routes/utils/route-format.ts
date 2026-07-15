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
