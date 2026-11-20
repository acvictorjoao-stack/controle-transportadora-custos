import type {TripFinancialSummary} from '@/features/trips/types/trip-financial-summary';

/**
 * Resultado de uma viagem na ficha do cliente.
 * - final: viagem concluída e financeiro visível — frete − custos, definitivo;
 * - partial: viagem ainda em curso — custos podem chegar, então não há número
 *   (o frete inteiro pareceria lucro);
 * - unavailable: sem acesso ao financeiro, viagem cancelada ou resumo ausente.
 */
export type CustomerTripResult =
  | {kind: 'final'; value: number}
  | {kind: 'partial'}
  | {kind: 'unavailable'};

export function resolveCustomerTripResult(
  summary: Pick<TripFinancialSummary, 'result' | 'financialVisible'> | undefined,
  tripStatus: string,
): CustomerTripResult {
  if (!summary || !summary.financialVisible || summary.result === null) {
    return {kind: 'unavailable'};
  }
  if (tripStatus === 'completed') return {kind: 'final', value: summary.result};
  if (tripStatus === 'cancelled') return {kind: 'unavailable'};
  return {kind: 'partial'};
}

/** Texto da coluna: valor só para resultado definitivo. */
export function formatCustomerTripResult(
  result: CustomerTripResult,
  formatCurrency: (value: number) => string,
): string {
  if (result.kind === 'final') return formatCurrency(result.value);
  if (result.kind === 'partial') return 'Parcial';
  return '—';
}
