import {ROUTES} from '@/constants/routes/paths';
import {toCivilDate} from '@/lib/formatting/date';

/**
 * Fase 2.2.4 — Link da viagem para a Rentabilidade por Viagem, no dia da
 * conclusão (dia de Brasília) e no veículo dela, onde aparece o resultado com
 * o rateio dos custos do veículo. Só para viagem concluída com veículo.
 */
export function buildAllocatedTripViewHref(trip: {
  tripStatus: string;
  completedAt: string | null;
  vehicleId: string | null;
}): string | null {
  if (trip.tripStatus !== 'completed' || !trip.vehicleId) return null;
  const day = toCivilDate(trip.completedAt);
  if (!day) return null;
  const params = new URLSearchParams({de: day, ate: day, veiculo: trip.vehicleId});
  return `${ROUTES.dashboardRentabilidadeViagens}?${params.toString()}`;
}
