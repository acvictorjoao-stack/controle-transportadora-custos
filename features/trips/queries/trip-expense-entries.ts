import type {SupabaseClient} from '@supabase/supabase-js';

import {TRIP_EXPENSE_SOURCE_MODULE} from '@/features/financial/constants/operation-financial';

import type {TripExpenseEntryRef} from '../utils/trip-expense-status';

interface TripExpenseEntryRow {
  id: string;
  source_id: string | null;
  entry_type: string;
  entry_status: string;
  paid_amount: number | string | null;
  metadata: Record<string, unknown> | null;
}

export function mapTripExpenseEntryRow(row: TripExpenseEntryRow): TripExpenseEntryRef | null {
  if (!row.source_id) return null;
  const treatment = row.metadata?.treatment;
  return {
    id: row.id,
    sourceId: row.source_id,
    entryType: row.entry_type,
    entryStatus: row.entry_status,
    paidAmount: row.paid_amount === null ? null : Number(row.paid_amount),
    treatment: typeof treatment === 'string' ? treatment : null,
  };
}

/**
 * Lançamentos (origem trip_expense) das despesas de uma viagem, só para ler a
 * situação financeira. A RLS devolve vazio para quem não tem financeiro:read;
 * a tela usa `financialVisible` do resumo para não confundir com "sem lançamento".
 */
export async function listTripExpenseEntries(
  supabase: SupabaseClient,
  companyId: string,
  tripId: string,
): Promise<TripExpenseEntryRef[]> {
  const {data, error} = await supabase
    .from('financial_entries')
    .select('id, source_id, entry_type, entry_status, paid_amount, metadata')
    .eq('company_id', companyId)
    .eq('trip_id', tripId)
    .eq('source_module', TRIP_EXPENSE_SOURCE_MODULE)
    .is('deleted_at', null);

  if (error) throw new Error(error.message);
  return ((data ?? []) as TripExpenseEntryRow[])
    .map(mapTripExpenseEntryRow)
    .filter((entry): entry is TripExpenseEntryRef => entry !== null);
}
