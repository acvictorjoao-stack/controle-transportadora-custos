import type {SupabaseClient} from '@supabase/supabase-js';

import {listFinancialEntriesByRelation} from '../queries/financial-entries';
import {buildTripFinancialBreakdown} from '../services/trip-financial-breakdown';
import type {TripFinancialBreakdownData} from '../types/trip-financial-breakdown';
import type {FinancialEntry} from '../types';

function toSourceRow(entry: FinancialEntry) {
  return {
    id: entry.id,
    entryType: entry.entryType,
    entryStatus: entry.entryStatus,
    amount: entry.amount,
    entryDate: entry.entryDate,
    description: entry.description,
    referenceNumber: entry.referenceNumber,
    supplier: entry.supplier,
    categoryName: entry.categoryName,
    categorySlug: entry.categorySlug,
    sourceModule: entry.sourceModule,
    sourceId: entry.sourceId,
    fuelRecordId: entry.fuelRecordId,
    maintenanceRecordId: entry.maintenanceRecordId,
    tireId: entry.tireId,
  };
}

/**
 * Loader do drill-down financeiro por viagem.
 * Uma única leitura em `financial_entries` via `listFinancialEntriesByRelation`.
 */
export async function getTripFinancialBreakdown(
  supabase: SupabaseClient,
  companyId: string,
  tripId: string,
): Promise<TripFinancialBreakdownData> {
  const entries = await listFinancialEntriesByRelation(
    supabase,
    companyId,
    {tripId},
    {limit: 500, excludeCancelled: true},
  );

  return buildTripFinancialBreakdown(tripId, entries.map(toSourceRow));
}
