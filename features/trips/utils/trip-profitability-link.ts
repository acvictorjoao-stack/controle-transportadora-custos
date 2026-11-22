import {ROUTES} from '@/constants/routes/paths';
import {toCivilDate} from '@/lib/formatting/date';

/**
 * Fase 2.2.4 — Link da viagem para a Rentabilidade por Viagem, no MÊS da
 * conclusão (dia de Brasília) e no veículo dela, onde aparece o resultado com
 * o rateio dos custos do veículo. Só para viagem concluída com veículo.
 *
 * Mês, e não o dia: o rateio distribui os custos do veículo sem viagem
 * lançados no período pelas viagens do veículo no mesmo período. Num único
 * dia quase nunca há custo a ratear e a viagem apareceria "sem rateio".
 */
export function buildAllocatedTripViewHref(trip: {
  tripStatus: string;
  completedAt: string | null;
  vehicleId: string | null;
}): string | null {
  if (trip.tripStatus !== 'completed' || !trip.vehicleId) return null;
  const day = toCivilDate(trip.completedAt);
  if (!day) return null;
  const [year, month] = day.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  const params = new URLSearchParams({
    de: `${monthKey}-01`,
    ate: `${monthKey}-${String(lastDay).padStart(2, '0')}`,
    veiculo: trip.vehicleId,
  });
  return `${ROUTES.dashboardRentabilidadeViagens}?${params.toString()}`;
}
