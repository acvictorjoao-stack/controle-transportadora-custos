import type {SupabaseClient} from '@supabase/supabase-js';

import type {
  TripFinancialSummary,
  TripFinancialSummaryRow,
} from '../types/trip-financial-summary';

export const TRIP_FINANCIAL_SUMMARY_COLUMNS = `
  trip_id, trip_number, trip_status, completed_at,
  freight_amount, direct_costs, fuel_costs, maintenance_costs, tire_costs, other_costs,
  direct_cost_entries, result, margin_percent, advances_total, reimbursements_total,
  unposted_trip_expenses_amount, unposted_trip_expenses_count,
  legacy_advance_expenses_amount, legacy_advance_expenses_count,
  receivable_entry_id, receivable_status, receivable_amount, receivable_received,
  receivable_balance, financial_visible
`;

function money(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function optionalMoney(value: number | string | null | undefined): number | null {
  return value === null || value === undefined ? null : money(value);
}

export function mapTripFinancialSummaryRow(row: TripFinancialSummaryRow): TripFinancialSummary {
  return {
    tripId: row.trip_id,
    tripNumber: row.trip_number,
    tripStatus: row.trip_status,
    completedAt: row.completed_at,
    freightAmount: money(row.freight_amount),
    // Nulo continua nulo: sem acesso ao financeiro a view não tem esses valores.
    directCosts: optionalMoney(row.direct_costs),
    fuelCosts: optionalMoney(row.fuel_costs),
    maintenanceCosts: optionalMoney(row.maintenance_costs),
    tireCosts: optionalMoney(row.tire_costs),
    otherCosts: optionalMoney(row.other_costs),
    directCostEntries: row.direct_cost_entries ?? null,
    result: optionalMoney(row.result),
    marginPercent: optionalMoney(row.margin_percent),
    advancesTotal: optionalMoney(row.advances_total),
    reimbursementsTotal: optionalMoney(row.reimbursements_total),
    unpostedTripExpensesAmount: optionalMoney(row.unposted_trip_expenses_amount),
    unpostedTripExpensesCount: row.unposted_trip_expenses_count ?? null,
    legacyAdvanceExpensesAmount: money(row.legacy_advance_expenses_amount),
    legacyAdvanceExpensesCount: row.legacy_advance_expenses_count ?? 0,
    receivableEntryId: row.receivable_entry_id,
    receivableStatus: row.receivable_status,
    receivableAmount: optionalMoney(row.receivable_amount),
    receivableReceived: optionalMoney(row.receivable_received),
    receivableBalance: optionalMoney(row.receivable_balance),
    financialVisible: row.financial_visible === true,
  };
}

/** Resultado de uma viagem, lido da view `trip_financial_summary`. */
export async function getTripFinancialSummary(
  supabase: SupabaseClient,
  companyId: string,
  tripId: string,
): Promise<TripFinancialSummary | null> {
  const {data, error} = await supabase
    .from('trip_financial_summary')
    .select(TRIP_FINANCIAL_SUMMARY_COLUMNS)
    .eq('company_id', companyId)
    .eq('trip_id', tripId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapTripFinancialSummaryRow(data as unknown as TripFinancialSummaryRow) : null;
}

/** Resultado de várias viagens (lista, ficha do cliente). */
export async function listTripFinancialSummaries(
  supabase: SupabaseClient,
  companyId: string,
  tripIds: string[],
): Promise<Map<string, TripFinancialSummary>> {
  const unique = Array.from(new Set(tripIds.filter(Boolean)));
  const byTrip = new Map<string, TripFinancialSummary>();
  if (unique.length === 0) return byTrip;

  const {data, error} = await supabase
    .from('trip_financial_summary')
    .select(TRIP_FINANCIAL_SUMMARY_COLUMNS)
    .eq('company_id', companyId)
    .in('trip_id', unique);

  if (error) throw new Error(error.message);
  for (const row of (data ?? []) as unknown as TripFinancialSummaryRow[]) {
    byTrip.set(row.trip_id, mapTripFinancialSummaryRow(row));
  }
  return byTrip;
}
