/**
 * Rótulo de rota no padrão "Origem → Destino" da análise de custos.
 */
export function formatOperationalDreRouteLabel(input: {
  origin?: string | null;
  destination?: string | null;
  name?: string | null;
}): string {
  const origin = input.origin?.trim();
  const destination = input.destination?.trim();
  if (origin && destination) return `${origin} → ${destination}`;
  const name = input.name?.trim();
  if (name) return name;
  return 'Sem rota';
}
