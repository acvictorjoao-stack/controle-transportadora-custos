/**
 * Rótulo de rota no padrão Nome da Rota, com fallback "Origem → Destino".
 */
import {formatRouteDisplayName} from '@/features/routes/utils/route-format';

export function formatOperationalDreRouteLabel(input: {
  origin?: string | null;
  destination?: string | null;
  name?: string | null;
}): string {
  return formatRouteDisplayName(input);
}
