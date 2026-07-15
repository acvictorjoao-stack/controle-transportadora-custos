/**
 * Helpers for trips linked to operational routes.
 */

export function getTripRouteLabel(trip: {
  routeId: string | null;
  routeName: string | null;
  route: string | null;
}): string {
  if (trip.routeId) {
    return trip.routeName?.trim() || trip.route?.trim() || 'Rota vinculada';
  }
  if (trip.route?.trim()) return trip.route.trim();
  return 'Sem rota cadastrada';
}
