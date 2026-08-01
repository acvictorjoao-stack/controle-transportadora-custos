/**
 * Helpers for trips linked to operational routes.
 */

import {formatRouteDisplayName} from '@/features/routes/utils/route-format';

export function getTripRouteLabel(trip: {
  routeId: string | null;
  routeName: string | null;
  route: string | null;
  origin?: string | null;
  destination?: string | null;
}): string {
  if (trip.routeId) {
    return formatRouteDisplayName({
      name: trip.routeName || trip.route,
      origin: trip.origin,
      destination: trip.destination,
    });
  }
  if (trip.route?.trim()) return trip.route.trim();
  return 'Sem rota cadastrada';
}
