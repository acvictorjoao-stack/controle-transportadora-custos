import type {SupabaseClient} from '@supabase/supabase-js';

import {getCustomerStats} from '@/features/customers/queries';
import {getDriverStats} from '@/features/drivers/queries';
import {listTrips} from '@/features/trips/queries';
import type {TripStatus} from '@/features/trips/types';
import {getTripFreightValue} from '@/features/trips/utils/trip-lifecycle';
import {getVehicleStats} from '@/features/vehicles/queries';

import type {OperationalDashboardData} from '../types/operational-dashboard';

const IN_PROGRESS_STATUSES: TripStatus[] = [
  'loading',
  'in_progress',
  'delivering',
  'waiting',
];

function asNumber(value: unknown): number {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : 0;
}

async function countActiveRoutes(
  supabase: SupabaseClient,
  companyId: string,
): Promise<number> {
  const {count, error} = await supabase
    .from('routes')
    .select('id', {count: 'exact', head: true})
    .eq('company_id', companyId)
    .eq('operational_status', 'active')
    .is('deleted_at', null);

  if (error) return 0;
  return count ?? 0;
}

async function loadTripFinancialAggregates(
  supabase: SupabaseClient,
  companyId: string,
): Promise<{
  programmed: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  totalFreight: number;
  tripCount: number;
  vehiclesOnTrip: number;
  driversOnTrip: number;
}> {
  const {data, error} = await supabase
    .from('trips')
    .select(
      'trip_status, contracted_freight_value, actual_freight_value, vehicle_id, driver_id',
    )
    .eq('company_id', companyId)
    .is('deleted_at', null);

  if (error || !data) {
    return {
      programmed: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
      totalFreight: 0,
      tripCount: 0,
      vehiclesOnTrip: 0,
      driversOnTrip: 0,
    };
  }

  let programmed = 0;
  let inProgress = 0;
  let completed = 0;
  let cancelled = 0;
  let totalFreight = 0;
  const vehiclesOnTrip = new Set<string>();
  const driversOnTrip = new Set<string>();

  for (const row of data) {
    const status = row.trip_status as TripStatus;
    if (status === 'planned') programmed += 1;
    if (IN_PROGRESS_STATUSES.includes(status)) {
      inProgress += 1;
      if (typeof row.vehicle_id === 'string') vehiclesOnTrip.add(row.vehicle_id);
      if (typeof row.driver_id === 'string') driversOnTrip.add(row.driver_id);
    }
    if (status === 'completed') completed += 1;
    if (status === 'cancelled') cancelled += 1;

    totalFreight += getTripFreightValue({
      contractedFreightValue:
        row.contracted_freight_value !== null
          ? asNumber(row.contracted_freight_value)
          : null,
      actualFreightValue:
        row.actual_freight_value !== null ? asNumber(row.actual_freight_value) : null,
    });
  }

  return {
    programmed,
    inProgress,
    completed,
    cancelled,
    totalFreight,
    tripCount: data.length,
    vehiclesOnTrip: vehiclesOnTrip.size,
    driversOnTrip: driversOnTrip.size,
  };
}

async function loadTripExpensesTotal(
  supabase: SupabaseClient,
  companyId: string,
): Promise<number> {
  const {data, error} = await supabase
    .from('trip_expenses')
    .select('amount')
    .eq('company_id', companyId)
    .is('deleted_at', null);

  if (error || !data) return 0;

  return data.reduce((sum, row) => sum + asNumber(row.amount), 0);
}

export async function getOperationalDashboardData(
  supabase: SupabaseClient,
  companyId: string,
): Promise<OperationalDashboardData> {
  const [
    tripAggregates,
    totalExpenses,
    customerStats,
    vehicleStats,
    driverStats,
    activeRoutes,
    recentTripsPage,
  ] = await Promise.all([
    loadTripFinancialAggregates(supabase, companyId),
    loadTripExpensesTotal(supabase, companyId),
    getCustomerStats(supabase, companyId),
    getVehicleStats(supabase, companyId),
    getDriverStats(supabase, companyId),
    countActiveRoutes(supabase, companyId),
    listTrips(supabase, {
      companyId,
      page: 1,
      pageSize: 10,
      sort: {sortBy: 'created_at', sortOrder: 'desc'},
    }),
  ]);

  const operationalResult = tripAggregates.totalFreight - totalExpenses;
  const divisor = tripAggregates.tripCount > 0 ? tripAggregates.tripCount : 0;

  const vehiclesOnTrip = tripAggregates.vehiclesOnTrip;
  const driversOnTrip = tripAggregates.driversOnTrip;

  return {
    trips: {
      programmed: tripAggregates.programmed,
      inProgress: tripAggregates.inProgress,
      completed: tripAggregates.completed,
      cancelled: tripAggregates.cancelled,
    },
    financial: {
      totalFreight: tripAggregates.totalFreight,
      totalExpenses,
      operationalResult,
      averageFreight: divisor > 0 ? tripAggregates.totalFreight / divisor : 0,
      averageExpense: divisor > 0 ? totalExpenses / divisor : 0,
      averageResult: divisor > 0 ? operationalResult / divisor : 0,
    },
    registries: {
      activeCustomers: customerStats.active,
      activeVehicles: vehicleStats.active,
      activeDrivers: driverStats.active,
      activeRoutes,
    },
    fleet: {
      available: Math.max(0, vehicleStats.active - vehiclesOnTrip),
      onTrip: vehiclesOnTrip,
      maintenance: vehicleStats.maintenance,
    },
    drivers: {
      available: Math.max(0, driverStats.active - driversOnTrip),
      onTrip: driversOnTrip,
      inactive: driverStats.inactive,
    },
    recentTrips: recentTripsPage.items.map((trip) => ({
      id: trip.id,
      tripNumber: trip.tripNumber,
      customerName: trip.customerName ?? trip.clientName ?? '—',
      vehiclePlate: trip.vehiclePlate ?? '—',
      driverName: trip.driverName ?? '—',
      tripStatus: trip.tripStatus,
    })),
  };
}
