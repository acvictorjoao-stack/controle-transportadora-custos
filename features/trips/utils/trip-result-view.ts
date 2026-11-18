import type {TripFinancialSummary} from '../types/trip-financial-summary';

export interface TripResultCostLine {
  label: string;
  amount: number;
}

export type TripResultView =
  | {state: 'unavailable'; freight: number}
  | {state: 'restricted'; freight: number}
  | {
      state: 'ready';
      freight: number;
      directCosts: number;
      /** Custo direto sem as despesas da aba: combustível, manutenção, pneus e outros. */
      operationalCosts: number;
      operationalLines: TripResultCostLine[];
      /** Despesas da aba já no financeiro (grupo próprio, como na DRE). */
      tripExpenseCosts: number;
      result: number;
      marginPercent: number | null;
      costLines: TripResultCostLine[];
      /** Aviso quando há despesas da aba fora do financeiro (antes da Etapa 2). */
      unpostedNotice: string | null;
      /** Adiantamento é caixa entregue ao motorista, não custo. */
      advanceNotice: string | null;
    };

function formatBrl(value: number): string {
  return value.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
}

/**
 * Monta o "Resultado" da viagem a partir de `trip_financial_summary`, a mesma
 * conta da DRE. Sem a view (ou sem acesso ao financeiro) não há resultado:
 * mostrar frete − aba Despesas reabriria a divergência com a DRE.
 */
export function buildTripResultView(
  summary: TripFinancialSummary | null,
  fallbackFreight: number,
): TripResultView {
  if (!summary) return {state: 'unavailable', freight: fallbackFreight};
  if (!summary.financialVisible) return {state: 'restricted', freight: summary.freightAmount};
  // Com acesso a view sempre preenche custo e resultado; nulo aqui é dado
  // incompleto, e a tela não troca nulo por zero.
  if (summary.result === null || summary.directCosts === null) {
    return {state: 'unavailable', freight: summary.freightAmount};
  }

  // Mesmos grupos da DRE: despesas da aba têm linha própria (migration 111).
  const costLines = [
    {label: 'Despesas de viagem', amount: summary.tripExpenseCosts},
    {label: 'Combustível', amount: summary.fuelCosts},
    {label: 'Manutenção', amount: summary.maintenanceCosts},
    {label: 'Pneus', amount: summary.tireCosts},
    {label: 'Outros', amount: summary.otherCosts},
  ].filter((line): line is TripResultCostLine => line.amount !== null && line.amount !== 0);

  const tripExpenseCosts = summary.tripExpenseCosts ?? 0;
  const operationalLines = costLines.filter((line) => line.label !== 'Despesas de viagem');
  const operationalCosts = Math.round((summary.directCosts - tripExpenseCosts) * 100) / 100;

  const unpostedCount = summary.unpostedTripExpensesCount ?? 0;
  const unpostedNotice =
    unpostedCount > 0
      ? `${formatBrl(summary.unpostedTripExpensesAmount ?? 0)} em ${unpostedCount} ` +
        `despesa(s) da aba ainda sem lançamento no financeiro: ficam fora do resultado e da DRE.`
      : null;

  const advanceTotal = (summary.advancesTotal ?? 0) + summary.legacyAdvanceExpensesAmount;
  const advanceNotice =
    advanceTotal > 0
      ? `${formatBrl(advanceTotal)} em adiantamento ao motorista: é caixa, não custo da viagem.`
      : null;

  return {
    state: 'ready',
    freight: summary.freightAmount,
    directCosts: summary.directCosts,
    operationalCosts,
    operationalLines,
    tripExpenseCosts,
    result: summary.result,
    marginPercent: summary.marginPercent,
    costLines,
    unpostedNotice,
    advanceNotice,
  };
}
