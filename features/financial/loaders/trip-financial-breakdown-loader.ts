import type {SupabaseClient} from '@supabase/supabase-js';

import {mapDatabaseError} from '@/features/master/companies/utils/database-error';
import {getTripById} from '@/features/trips/queries';
import {getTripFreightValue} from '@/features/trips/utils/trip-lifecycle';

import {FINANCIAL_LIST_COLUMNS} from '../constants';
import {listFinancialEntriesByRelation} from '../queries/financial-entries';
import {
  allocateOperationalCostsByMileage,
  type AllocatedOperationalCost,
} from '../services/allocate-operational-costs-by-mileage';
import {mapFinancialEntryRow} from '../services/mappers';
import {buildTripFinancialBreakdown} from '../services/trip-financial-breakdown';
import type {FinancialEntry, FinancialEntryRow} from '../types';
import type {
  TripFinancialBreakdownData,
  TripFinancialBreakdownPeriod,
  TripFinancialBreakdownSourceRow,
} from '../types/trip-financial-breakdown';

function asNumber(value: unknown): number {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : 0;
}

function computeDistanceKm(initial: number | null, final: number | null): number {
  if (initial === null || final === null) return 0;
  const diff = final - initial;
  return diff >= 0 ? diff : 0;
}

function toSourceRow(
  entry: FinancialEntry,
  allocation?: Pick<
    AllocatedOperationalCost,
    'amount' | 'allocation' | 'share' | 'originalAmount'
  >,
): TripFinancialBreakdownSourceRow {
  return {
    id: entry.id,
    entryType: entry.entryType,
    entryStatus: entry.entryStatus,
    amount: allocation?.amount ?? entry.amount,
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
    allocation: allocation?.allocation ?? 'direct',
    allocationShare: allocation?.share ?? 1,
    originalAmount: allocation?.originalAmount ?? entry.amount,
  };
}

function resolveDefaultPeriod(
  completedAt: string | null | undefined,
): TripFinancialBreakdownPeriod {
  if (!completedAt) return {};
  const date = completedAt.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return {};
  const [year, month] = date.split('-');
  const lastDay = new Date(Number(year), Number(month), 0).getDate();
  return {
    dateFrom: `${year}-${month}-01`,
    dateTo: `${year}-${month}-${String(lastDay).padStart(2, '0')}`,
  };
}

type VehicleTripRaw = {
  id: string;
  vehicle_id: string | null;
  initial_odometer_km: number | null;
  final_odometer_km: number | null;
  planned_distance_km: number | null;
};

/**
 * Viagens concluídas do veículo no período — base de KM do rateio.
 * Uma query por carga (sem N+1).
 */
async function fetchVehicleTripsForMileage(
  supabase: SupabaseClient,
  companyId: string,
  vehicleId: string,
  period: TripFinancialBreakdownPeriod,
): Promise<Array<{tripId: string; vehicleId: string | null; distanceKm: number}>> {
  let query = supabase
    .from('trips')
    .select(
      'id, vehicle_id, initial_odometer_km, final_odometer_km, planned_distance_km',
    )
    .eq('company_id', companyId)
    .eq('vehicle_id', vehicleId)
    .eq('trip_status', 'completed')
    .is('deleted_at', null);

  if (period.dateFrom) query = query.gte('completed_at', period.dateFrom);
  if (period.dateTo) {
    query = query.lte('completed_at', `${period.dateTo}T23:59:59.999Z`);
  }

  const {data, error} = await query;
  if (error) throw new Error(mapDatabaseError(error));

  return ((data ?? []) as VehicleTripRaw[]).map((row) => {
    const odometerKm = computeDistanceKm(
      row.initial_odometer_km !== null ? asNumber(row.initial_odometer_km) : null,
      row.final_odometer_km !== null ? asNumber(row.final_odometer_km) : null,
    );
    const plannedKm =
      row.planned_distance_km !== null ? asNumber(row.planned_distance_km) : 0;
    return {
      tripId: row.id,
      vehicleId: row.vehicle_id,
      distanceKm: odometerKm > 0 ? odometerKm : plannedKm,
    };
  });
}

/**
 * Despesas do veículo sem `trip_id` no período — candidatas ao rateio.
 */
async function fetchVehicleUnlinkedExpenses(
  supabase: SupabaseClient,
  companyId: string,
  vehicleId: string,
  period: TripFinancialBreakdownPeriod,
): Promise<FinancialEntry[]> {
  let query = supabase
    .from('financial_entries')
    .select(FINANCIAL_LIST_COLUMNS)
    .eq('company_id', companyId)
    .eq('vehicle_id', vehicleId)
    .eq('entry_type', 'expense')
    .is('trip_id', null)
    .is('deleted_at', null)
    .not('entry_status', 'in', '(cancelled,reversed)')
    .order('entry_date', {ascending: false})
    .limit(500);

  if (period.dateFrom) query = query.gte('entry_date', period.dateFrom);
  if (period.dateTo) query = query.lte('entry_date', period.dateTo);

  const {data, error} = await query;
  if (error) throw new Error(mapDatabaseError(error));

  return (data ?? []).map((row) =>
    mapFinancialEntryRow(row as unknown as FinancialEntryRow),
  );
}

/**
 * Loader do drill-down financeiro por viagem (RC 26.9.2).
 *
 * - Receita: `getTripFreightValue` (mesma origem da DRE).
 * - Custos com `trip_id`: valor integral.
 * - Custos sem `trip_id` + veículo + período: rateio por KM.
 */
export async function getTripFinancialBreakdown(
  supabase: SupabaseClient,
  companyId: string,
  tripId: string,
  period: TripFinancialBreakdownPeriod = {},
): Promise<TripFinancialBreakdownData> {
  const trip = await getTripById(supabase, companyId, tripId);
  if (!trip) {
    return buildTripFinancialBreakdown(tripId, [], {revenue: 0});
  }

  const revenue = getTripFreightValue({
    contractedFreightValue: trip.contractedFreightValue,
    actualFreightValue: trip.actualFreightValue,
  });

  const directEntries = await listFinancialEntriesByRelation(
    supabase,
    companyId,
    {tripId},
    {limit: 500, excludeCancelled: true},
  );

  const sourceRows: TripFinancialBreakdownSourceRow[] = directEntries
    .filter((entry) => entry.entryType === 'expense')
    .map((entry) =>
      toSourceRow(entry, {
        amount: entry.amount,
        allocation: 'direct',
        share: 1,
        originalAmount: entry.amount,
      }),
    );

  const vehicleId = trip.vehicleId;
  const hasExplicitPeriod = Boolean(period.dateFrom || period.dateTo);
  const resolvedPeriod = hasExplicitPeriod
    ? period
    : resolveDefaultPeriod(trip.completedAt);
  const canAllocate = Boolean(
    vehicleId && (resolvedPeriod.dateFrom || resolvedPeriod.dateTo),
  );

  if (canAllocate && vehicleId) {
    const [vehicleTrips, unlinkedExpenses] = await Promise.all([
      fetchVehicleTripsForMileage(supabase, companyId, vehicleId, resolvedPeriod),
      fetchVehicleUnlinkedExpenses(supabase, companyId, vehicleId, resolvedPeriod),
    ]);

    if (unlinkedExpenses.length > 0 && vehicleTrips.length > 0) {
      const allocation = allocateOperationalCostsByMileage(
        unlinkedExpenses.map((entry) => ({
          id: entry.id,
          amount: entry.amount,
          tripId: null,
          vehicleId: entry.vehicleId,
        })),
        vehicleTrips,
      );

      const byExpenseId = new Map(
        unlinkedExpenses.map((entry) => [entry.id, entry] as const),
      );

      for (const item of allocation.getForTrip(tripId)) {
        if (item.allocation !== 'mileage') continue;
        const entry = byExpenseId.get(item.expenseId);
        if (!entry) continue;
        sourceRows.push(
          toSourceRow(entry, {
            amount: item.amount,
            allocation: 'mileage',
            share: item.share,
            originalAmount: item.originalAmount,
          }),
        );
      }
    }
  }

  return buildTripFinancialBreakdown(tripId, sourceRows, {revenue});
}
