import type {SupabaseClient} from '@supabase/supabase-js';

import {CASH_FLOW_SOURCE_MODULES} from '@/features/cash-flow/constants';
import {getOperationalDRE} from '@/features/dre/loaders/operational-dre-loader';
import {mapDatabaseError} from '@/features/master/companies/utils/database-error';
import {toCivilDate} from '@/lib/formatting/date';
import {fetchAllPagedRows, type PagedFetchResult} from '@/lib/supabase/fetch-all-pages';

import type {
  CategoryRow,
  FinancialEntryRow,
  TripExpenseRow,
  TripRow,
} from '../consistency/fase1-consistency';
import type {ReconciliationFinding} from '../consistency/reconciliation';
import {
  compareDreWithStats,
  compareTripsWithDre,
  findCashFlowDirectionIssues,
  type CashFlowLineInput,
} from '../consistency/report-reconciliation';
import type {TripSummaryRow} from '../consistency/trip-summary';
import {getFinancialStats} from '../queries/financial-entries';

/**
 * Fase 2.1.3 — Comparações de relatório (R11–R13) com a RLS de quem consulta.
 * Só lê. Quem não tem acesso a um módulo simplesmente não recebe os achados
 * dele (as consultas voltam vazias), nunca um falso positivo.
 */

export interface ReconciliationReportPeriod {
  /** YYYY-MM-DD, inclusive. */
  dateFrom?: string;
  /** YYYY-MM-DD, inclusive. */
  dateTo?: string;
}

export interface ReconciliationReport {
  findings: ReconciliationFinding[];
  scope: {
    /** `get_financial_stats` não recebe período: a R11 é sempre do acumulado. */
    dreVersusStats: 'all_time';
    tripsChecked: number;
    cashFlowLinesChecked: number;
  };
}

const TRIP_COLUMNS =
  'id, trip_number, trip_status, completed_at, actual_freight_value, contracted_freight_value, freight_margin, deleted_at';
const EXPENSE_COLUMNS =
  'id, trip_id, expense_type, amount, expense_date, description, deleted_at, paid_by, payment_method';
const ENTRY_COLUMNS = [
  'id, entry_type, entry_status, amount, paid_amount, paid_at, entry_date, due_date',
  'description, category_id, source_module, source_id, installment_number, trip_id',
  'fuel_record_id, maintenance_record_id, tire_id, deleted_at, trip_charge_key, adjustment_total',
].join(', ');
const SUMMARY_COLUMNS =
  'trip_id, trip_number, freight_amount, direct_costs, fuel_costs, maintenance_costs, tire_costs, other_costs, trip_expense_costs, result, advances_total, unposted_trip_expenses_amount, unposted_trip_expenses_count';
const CASH_FLOW_LINE_COLUMNS =
  'line_id, financial_entry_id, movement_id, entry_type, line_status, source_module, movement_date, line_amount, description';

type PageQuery = (
  from: number,
  to: number,
) => PromiseLike<{data: unknown; error: PagedFetchResult<unknown>['error']; count: number | null}>;

/** Lê todas as páginas; as colunas vêm de listas fixas acima, tipadas pelas linhas da Fase 1. */
function readAll<T>(query: PageQuery): Promise<T[]> {
  return fetchAllPagedRows<T>(
    async (from, to) => {
      const {data, error, count} = await query(from, to);
      return {data: (data as T[] | null) ?? null, error, count};
    },
    {mapError: (error) => new Error(mapDatabaseError(error))},
  );
}

function inPeriod(date: string | null, period: ReconciliationReportPeriod): boolean {
  if (!date) return false;
  if (period.dateFrom && date < period.dateFrom) return false;
  if (period.dateTo && date > period.dateTo) return false;
  return true;
}

async function loadTripComparison(
  supabase: SupabaseClient,
  companyId: string,
  period: ReconciliationReportPeriod,
): Promise<{findings: ReconciliationFinding[]; tripsChecked: number}> {
  const [allTrips, expenses, entries, categories, summaries] = await Promise.all([
    readAll<TripRow>((from, to) =>
      supabase
        .from('trips')
        .select(TRIP_COLUMNS, {count: 'exact'})
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .order('id')
        .range(from, to),
    ),
    readAll<TripExpenseRow>((from, to) =>
      supabase
        .from('trip_expenses')
        .select(EXPENSE_COLUMNS, {count: 'exact'})
        .eq('company_id', companyId)
        .order('id')
        .range(from, to),
    ),
    readAll<FinancialEntryRow>((from, to) =>
      supabase
        .from('financial_entries')
        .select(ENTRY_COLUMNS, {count: 'exact'})
        .eq('company_id', companyId)
        .not('trip_id', 'is', null)
        .order('id')
        .range(from, to),
    ),
    readAll<CategoryRow>((from, to) =>
      supabase
        .from('financial_categories')
        .select('id, slug', {count: 'exact'})
        .eq('company_id', companyId)
        .order('id')
        .range(from, to),
    ),
    readAll<TripSummaryRow>((from, to) =>
      supabase
        .from('trip_financial_summary')
        .select(SUMMARY_COLUMNS, {count: 'exact'})
        .eq('company_id', companyId)
        .order('trip_id')
        .range(from, to),
    ),
  ]);

  // Recorte: viagens concluídas no período (dia de Brasília), a competência da DRE.
  const hasPeriod = Boolean(period.dateFrom || period.dateTo);
  const trips = hasPeriod
    ? allTrips.filter((trip) => inPeriod(toCivilDate(trip.completed_at), period))
    : allTrips;

  return {
    findings: compareTripsWithDre({trips, expenses, entries, categories, summaries}),
    tripsChecked: trips.length,
  };
}

async function loadCashFlowDirection(
  supabase: SupabaseClient,
  companyId: string,
  period: ReconciliationReportPeriod,
): Promise<{findings: ReconciliationFinding[]; linesChecked: number}> {
  // Só linhas de movimento podem chegar com valor negativo (estorno).
  const lines = await readAll<CashFlowLineInput>((from, to) => {
    let query = supabase
      .from('financial_cash_flow_lines')
      .select(CASH_FLOW_LINE_COLUMNS, {count: 'exact'})
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .eq('line_status', 'paid')
      .not('movement_id', 'is', null)
      .in('source_module', [...CASH_FLOW_SOURCE_MODULES]);
    if (period.dateFrom) query = query.gte('movement_date', period.dateFrom);
    if (period.dateTo) query = query.lte('movement_date', period.dateTo);
    return query.order('line_id').range(from, to);
  });
  return {findings: findCashFlowDirectionIssues(lines), linesChecked: lines.length};
}

export async function loadReconciliationReport(
  supabase: SupabaseClient,
  companyId: string,
  period: ReconciliationReportPeriod = {},
): Promise<ReconciliationReport> {
  const [dre, stats, tripComparison, cashFlow] = await Promise.all([
    getOperationalDRE(supabase, companyId, {}),
    getFinancialStats(supabase, companyId),
    loadTripComparison(supabase, companyId, period),
    loadCashFlowDirection(supabase, companyId, period),
  ]);

  return {
    findings: [
      ...compareDreWithStats({
        dre: {
          totalRevenue: dre.revenues.totalRevenue,
          totalOperatingCosts: dre.costs.totalOperatingCosts,
        },
        stats: {revenue: stats.revenue, expenses: stats.expenses},
      }),
      ...tripComparison.findings,
      ...cashFlow.findings,
    ],
    scope: {
      dreVersusStats: 'all_time',
      tripsChecked: tripComparison.tripsChecked,
      cashFlowLinesChecked: cashFlow.linesChecked,
    },
  };
}
