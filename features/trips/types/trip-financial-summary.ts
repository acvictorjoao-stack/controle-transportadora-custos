/**
 * Linha de `trip_financial_summary` (migration 110): fonte única do resultado
 * da viagem. Frete e custo direto seguem as mesmas regras da DRE.
 *
 * Sem acesso ao financeiro (`financialVisible = false`), custos, resultado,
 * adiantamentos, despesas sem lançamento e título vêm `null` — nunca zero.
 */
export interface TripFinancialSummary {
  tripId: string;
  tripNumber: string;
  tripStatus: string;
  completedAt: string | null;
  freightAmount: number;
  directCosts: number | null;
  fuelCosts: number | null;
  maintenanceCosts: number | null;
  tireCosts: number | null;
  otherCosts: number | null;
  directCostEntries: number | null;
  /**
   * Despesas da aba da viagem já no financeiro (migration 111). Nulo sem acesso
   * ao financeiro e enquanto a 111 não existir no banco (view da 110).
   */
  tripExpenseCosts: number | null;
  /** Frete − custo direto. */
  result: number | null;
  marginPercent: number | null;
  /** Adiantamentos ao motorista: caixa, nunca custo. */
  advancesTotal: number | null;
  reimbursementsTotal: number | null;
  /** Despesas da aba ainda sem lançamento no financeiro (antes da Etapa 2). */
  unpostedTripExpensesAmount: number | null;
  unpostedTripExpensesCount: number | null;
  /** Despesas antigas da aba com tipo "adiantamento" (convertidas na Etapa 4). */
  legacyAdvanceExpensesAmount: number;
  legacyAdvanceExpensesCount: number;
  receivableEntryId: string | null;
  receivableStatus: string | null;
  receivableAmount: number | null;
  receivableReceived: number | null;
  receivableBalance: number | null;
  /** Falso quando a RLS esconde os lançamentos de quem consulta. */
  financialVisible: boolean;
}

export interface TripFinancialSummaryRow {
  trip_id: string;
  trip_number: string;
  trip_status: string;
  completed_at: string | null;
  freight_amount: number | string | null;
  direct_costs: number | string | null;
  fuel_costs: number | string | null;
  maintenance_costs: number | string | null;
  tire_costs: number | string | null;
  other_costs: number | string | null;
  direct_cost_entries: number | null;
  result: number | string | null;
  margin_percent: number | string | null;
  advances_total: number | string | null;
  reimbursements_total: number | string | null;
  unposted_trip_expenses_amount: number | string | null;
  unposted_trip_expenses_count: number | null;
  legacy_advance_expenses_amount: number | string | null;
  legacy_advance_expenses_count: number | null;
  receivable_entry_id: string | null;
  receivable_status: string | null;
  receivable_amount: number | string | null;
  receivable_received: number | string | null;
  receivable_balance: number | string | null;
  financial_visible: boolean | null;
  /** Coluna acrescentada no fim da view pela migration 111. */
  trip_expense_costs?: number | string | null;
}
