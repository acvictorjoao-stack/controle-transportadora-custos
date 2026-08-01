import type {RouteOperationalStatus} from '../types';
import {leadDaysFromStored} from './lead-time';

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

/** @deprecated Prefer formatLeadTimeDays — kept for legacy minute displays. */
export function formatMinutes(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${value.toLocaleString('pt-BR')} min`;
}

export function formatLeadTimeDays(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const label = value === 1 ? 'dia' : 'dias';
  return `${value.toLocaleString('pt-BR')} ${label}`;
}

export function buildAutoRouteName(origin: string, destination: string): string {
  return `${origin.trim()} → ${destination.trim()}`;
}

/**
 * Visual label for dashboards/reports.
 * Prefers Nome da Rota; falls back to Origem → Destino.
 */
export function formatRouteDisplayName(input: {
  name?: string | null;
  origin?: string | null;
  destination?: string | null;
}): string {
  const name = input.name?.trim();
  if (name) return name;
  const origin = input.origin?.trim();
  const destination = input.destination?.trim();
  if (origin && destination) return buildAutoRouteName(origin, destination);
  return origin || destination || 'Sem rota';
}

export function resolveLeadTimeDays(input: {
  leadTimeDays?: number | null;
  leadTimeMinutes?: number | null;
}): number | null {
  return leadDaysFromStored(input);
}
