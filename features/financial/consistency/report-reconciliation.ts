/**
 * Fase 2.1.3 — Comparações de relatório (R11, R12, R13), sem I/O.
 *
 * Não recria regra de cálculo: recebe o que a DRE, `get_financial_stats`, a
 * view `trip_financial_summary` e o Fluxo de Caixa já produzem e aponta onde
 * eles discordam. Os dados vêm de `loaders/reconciliation-report-loader.ts`.
 */

import {getCashFlowSignedLineAmount, getCashFlowType} from '@/features/cash-flow/utils/cash-flow-mappers';

import {
  checkAdvanceNotInDre,
  checkTripResultMatchesDre,
  roundMoney,
  toNumber,
  type CategoryRow,
  type FinancialEntryRow,
  type TripExpenseRow,
  type TripRow,
} from './fase1-consistency';
import {getReconciliationCheck, type ReconciliationFinding} from './reconciliation';
import {invariantsToFindings} from './reconciliation-invariants';
import {checkTripSummaryMatchesDre, type TripSummaryRow} from './trip-summary';

// ---------------------------------------------------------------------------
// R11 — DRE × indicadores (get_financial_stats)
// ---------------------------------------------------------------------------

export interface DreVersusStatsInput {
  /** DRE sem filtros (acumulado): `getOperationalDRE(supabase, companyId, {})`. */
  dre: {totalRevenue: number; totalOperatingCosts: number};
  /** `getFinancialStats`: a função do banco só calcula o acumulado da empresa. */
  stats: {revenue: number; expenses: number};
}

function periodFinding(
  severity: ReconciliationFinding['severity'],
  reference: string,
  expected: number,
  actual: number,
  details: Record<string, unknown>,
): ReconciliationFinding {
  const check = getReconciliationCheck('R11');
  return {
    checkId: check.id,
    severity,
    category: check.category,
    entityType: 'period',
    entityId: null,
    reference,
    expected,
    actual,
    details: {scope: 'all_time', ...details},
    legacy: false,
  };
}

/**
 * Custos: a DRE e os indicadores leem os mesmos lançamentos ativos; qualquer
 * diferença é defeito (alto). Receita: a DRE usa o frete das viagens
 * concluídas e os indicadores, os lançamentos de receita (inclusive manuais e
 * sem viagem); a diferença é esperada em parte e sai como aviso, com o valor.
 */
export function compareDreWithStats(input: DreVersusStatsInput): ReconciliationFinding[] {
  const findings: ReconciliationFinding[] = [];
  const dreCosts = roundMoney(input.dre.totalOperatingCosts);
  const statsCosts = roundMoney(input.stats.expenses);
  if (dreCosts !== statsCosts) {
    findings.push(
      periodFinding('high', 'Custos: DRE × indicadores (acumulado)', dreCosts, statsCosts, {
        metric: 'costs',
        difference: roundMoney(statsCosts - dreCosts),
      }),
    );
  }

  const dreRevenue = roundMoney(input.dre.totalRevenue);
  const statsRevenue = roundMoney(input.stats.revenue);
  if (dreRevenue !== statsRevenue) {
    findings.push(
      periodFinding('warning', 'Receita: DRE × indicadores (acumulado)', dreRevenue, statsRevenue, {
        metric: 'revenue',
        difference: roundMoney(statsRevenue - dreRevenue),
        note: 'DRE: frete das viagens concluídas. Indicadores: lançamentos de receita, inclusive sem viagem.',
      }),
    );
  }
  return findings;
}

// ---------------------------------------------------------------------------
// R12 — Viagem × DRE (I1, I3b e I9 da Fase 1)
// ---------------------------------------------------------------------------

export interface TripVersusDreInput {
  /** Viagens do recorte (as invariantes olham só estas). */
  trips: TripRow[];
  expenses: TripExpenseRow[];
  entries: FinancialEntryRow[];
  categories: CategoryRow[];
  /** Linhas reais da view `trip_financial_summary`. */
  summaries: TripSummaryRow[];
}

export function compareTripsWithDre(input: TripVersusDreInput): ReconciliationFinding[] {
  const tripIds = new Set(input.trips.map((trip) => trip.id));
  const tripEntries = input.entries.filter((entry) => entry.trip_id !== null && tripIds.has(entry.trip_id));
  const tripExpenses = input.expenses.filter((expense) => tripIds.has(expense.trip_id));
  const byNumber = new Map(input.trips.map((trip) => [trip.trip_number ?? trip.id, trip.id]));

  return invariantsToFindings([
    checkTripSummaryMatchesDre({
      summaries: input.summaries,
      trips: input.trips,
      entries: tripEntries,
      categories: input.categories,
    }),
    checkTripResultMatchesDre(input.trips, tripExpenses, tripEntries),
    checkAdvanceNotInDre(tripEntries),
  ]).map((finding) => {
    // I1/I3b identificam a viagem pelo número: devolve o id para o link.
    if (finding.entityType !== 'trip' || finding.entityId) return finding;
    const label = finding.reference.split(':')[0];
    return {...finding, entityId: byNumber.get(label) ?? null};
  });
}

// ---------------------------------------------------------------------------
// R13 — Fluxo de Caixa: movimento no sentido certo
// ---------------------------------------------------------------------------

/** Linha da view `financial_cash_flow_lines`, como o Fluxo de Caixa lê. */
export interface CashFlowLineInput {
  line_id: string;
  financial_entry_id: string;
  movement_id: string | null;
  entry_type: string;
  line_status: string;
  source_module: string | null;
  movement_date: string;
  line_amount: number | string;
  description: string | null;
}

/**
 * O total do período fecha por construção (resumo e lista somam as mesmas
 * linhas). O que falha é o sentido: o estorno de recebimento chega com valor
 * negativo e o mapeamento da tela (`mapCashFlowLine`) o mostra na coluna de
 * saída. Cada linha nessa situação vira um achado, até a tela ser corrigida.
 */
export function findCashFlowDirectionIssues(lines: CashFlowLineInput[]): ReconciliationFinding[] {
  const check = getReconciliationCheck('R13');
  const findings: ReconciliationFinding[] = [];
  for (const line of lines) {
    if (line.line_status !== 'paid') continue;
    const amount = toNumber(line.line_amount);
    const type = getCashFlowType({
      sourceModule: line.source_module,
      entryType: line.entry_type,
    } as Parameters<typeof getCashFlowType>[0]);
    if (type !== 'recebimento' || amount >= 0) continue;
    const signed = getCashFlowSignedLineAmount(type, amount);
    if (signed >= 0) continue;
    findings.push({
      checkId: check.id,
      severity: 'warning',
      category: check.category,
      entityType: line.movement_id ? 'movement' : 'financial_entry',
      entityId: line.movement_id ?? line.financial_entry_id,
      reference: `${line.description?.trim() || 'Recebimento'} — ${line.movement_date}`,
      expected: null,
      actual: roundMoney(amount),
      details: {
        reason: 'receipt_reversal_shown_as_outflow',
        financial_entry_id: line.financial_entry_id,
        movement_date: line.movement_date,
        line_id: line.line_id,
      },
      legacy: false,
    });
  }
  return findings;
}
