/**
 * Audit #17 — política única de quilometragem de viagens.
 *
 * - KM real/percorrido: `final_odometer_km − initial_odometer_km` quando ambos
 *   são válidos e a diferença não é negativa (contrato `trips_odometer_range`).
 * - KM planejado: `planned_distance_km` — planejamento, metas e previsão.
 * - KM operacional (DRE, rateio por KM, custo/KM): KM real > 0; senão o
 *   fallback histórico do projeto, KM planejado; senão 0.
 */

type KmInput = number | string | null | undefined;

function asFiniteNumber(value: KmInput): number | null {
  if (value == null) return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

/**
 * KM real a partir do odômetro. `null` quando ausente, não numérico ou
 * negativo — nunca inventa KM para viagem sem leitura final.
 */
export function computeTripActualDistanceKm(
  initialOdometerKm: KmInput,
  finalOdometerKm: KmInput,
): number | null {
  const initial = asFiniteNumber(initialOdometerKm);
  const final = asFiniteNumber(finalOdometerKm);
  if (initial === null || final === null) return null;
  const diff = final - initial;
  return diff >= 0 ? diff : null;
}

/** KM planejado. `null` quando ausente, não numérico ou negativo. */
export function resolveTripPlannedDistanceKm(
  plannedDistanceKm: KmInput,
): number | null {
  const planned = asFiniteNumber(plannedDistanceKm);
  if (planned === null || planned < 0) return null;
  return planned;
}

export interface TripOperationalDistanceInput {
  initialOdometerKm: KmInput;
  finalOdometerKm: KmInput;
  plannedDistanceKm: KmInput;
}

/**
 * KM usado pela DRE operacional e pelo rateio por KM. Sempre finito e ≥ 0.
 */
export function resolveTripOperationalDistanceKm(
  input: TripOperationalDistanceInput,
): number {
  const actual = computeTripActualDistanceKm(
    input.initialOdometerKm,
    input.finalOdometerKm,
  );
  if (actual !== null && actual > 0) return actual;

  const planned = resolveTripPlannedDistanceKm(input.plannedDistanceKm);
  return planned !== null && planned > 0 ? planned : 0;
}
