import type {SupabaseClient} from '@supabase/supabase-js';

import {mapDatabaseError} from '@/features/master/companies/utils/database-error';

import {
  TRIP_DETAIL_COLUMNS,
  TRIP_LIST_COLUMNS,
  TRIP_STORAGE_BUCKET,
  TRIPS_PAGE_SIZE,
} from '../constants';
import {
  mapTripChecklistRow,
  mapTripDocumentRow,
  mapTripExpenseRow,
  mapTripHistoryRow,
  mapTripLocationRow,
  mapTripOccurrenceRow,
  mapTripRow,
  mapTripStopRow,
} from '../services/mappers';
import type {
  PaginatedTrips,
  Trip,
  TripSelectOption,
  TripChecklist,
  TripDocument,
  TripExpense,
  TripHistory,
  TripListFilters,
  TripLocation,
  TripOccurrence,
  TripResourceAvailability,
  TripRow,
  TripSortOptions,
  TripStats,
  TripStop,
} from '../types';
import {
  canCancelTrip,
  canCompleteTrip,
  canStartTrip,
} from '../utils/trip-lifecycle';
import type {
  CancelTripInput,
  CompleteTripInput,
  CreateTripExpenseInput,
  CreateTripInput,
  CreateTripOccurrenceInput,
  CreateTripStopInput,
  UpdateTripExpenseInput,
  UpdateTripInput,
  UpsertTripChecklistInput,
} from '../validation';

export interface ListTripsOptions {
  companyId: string;
  search?: string;
  page?: number;
  pageSize?: number;
  filters?: TripListFilters;
  sort?: TripSortOptions;
}

const SORT_COLUMNS: Record<NonNullable<TripSortOptions['sortBy']>, string> = {
  trip_number: 'trip_number',
  trip_status: 'trip_status',
  departed_at: 'departed_at',
  client_name: 'client_name',
  created_at: 'created_at',
};

function sanitizeSearchTerm(value: string): string {
  return value.replace(/[%(),]/g, '').trim();
}

async function triggerTripCompletedIfNeeded(
  supabase: SupabaseClient,
  companyId: string,
  trip: Trip,
  profileId: string,
): Promise<void> {
  if (trip.tripStatus !== 'completed') return;

  try {
    const {onTripCompleted} = await import('@/features/financial/services/integration-events');
    await onTripCompleted(supabase, companyId, trip, profileId);
  } catch {
    // Financial integration must not block trip operations
  }
}

function buildTripPayload(
  input: CreateTripInput | UpdateTripInput,
  profileId: string,
  isCreate: boolean,
): Record<string, unknown> {
  // Campos V1 omitidos no payload (contrato, valor contratado, horímetro, cubagem)
  // para preservar valores antigos no banco em updates.
  const payload: Record<string, unknown> = {
    branch_id: input.branchId,
    driver_id: input.driverId,
    vehicle_id: input.vehicleId,
    client_name: input.clientName,
    customer_id: input.customerId,
    actual_freight_value: input.actualFreightValue,
    freight_margin: input.freightMargin,
    origin: input.origin,
    destination: input.destination,
    route: input.route,
    route_id: input.routeId,
    planned_distance_km: input.plannedDistanceKm,
    planned_departure_at: input.plannedDepartureAt,
    initial_odometer_km: input.initialOdometerKm,
    final_odometer_km: input.finalOdometerKm,
    departed_at: input.departedAt,
    arrived_at: input.arrivedAt,
    weight_kg: input.weightKg,
    cargo_type: input.cargoType,
    notes: input.notes,
    responsible: input.responsible,
    trip_status: isCreate ? 'planned' : (input.tripStatus ?? 'planned'),
    updated_by: profileId,
  };

  if (isCreate) {
    payload.created_by = profileId;
  }

  return payload;
}

export async function listTrips(
  supabase: SupabaseClient,
  options: ListTripsOptions,
): Promise<PaginatedTrips> {
  const search = sanitizeSearchTerm(options.search ?? '');
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? TRIPS_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const filters = options.filters ?? {};
  const sortBy = options.sort?.sortBy ?? 'departed_at';
  const sortOrder = options.sort?.sortOrder ?? 'desc';
  const ascending = sortOrder === 'asc';
  const sortColumn = SORT_COLUMNS[sortBy] ?? 'departed_at';

  let query = supabase
    .from('trips')
    .select(TRIP_LIST_COLUMNS, {count: 'exact'})
    .eq('company_id', options.companyId)
    .is('deleted_at', null);

  if (filters.tripStatus) {
    query = query.eq('trip_status', filters.tripStatus);
  }
  if (filters.driverId) {
    query = query.eq('driver_id', filters.driverId);
  }
  if (filters.vehicleId) {
    query = query.eq('vehicle_id', filters.vehicleId);
  }
  if (filters.branchId) {
    query = query.eq('branch_id', filters.branchId);
  }
  if (filters.routeId) {
    query = query.eq('route_id', filters.routeId);
  }
  if (filters.origin) {
    query = query.eq('origin', filters.origin);
  }
  if (filters.destination) {
    query = query.eq('destination', filters.destination);
  }
  if (filters.clientName) {
    query = query.ilike('client_name', `%${filters.clientName.trim()}%`);
  }
  if (filters.contractReference) {
    query = query.ilike('contract_reference', `%${filters.contractReference.trim()}%`);
  }
  if (filters.dateFrom) {
    query = query.gte('departed_at', filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte('departed_at', `${filters.dateTo}T23:59:59.999Z`);
  }

  if (search) {
    const {data: matchingRoutes} = await supabase
      .from('routes')
      .select('id')
      .eq('company_id', options.companyId)
      .is('deleted_at', null)
      .ilike('name', `%${search}%`)
      .limit(50);

    const routeIds = (matchingRoutes ?? []).map((row) => row.id);
    const orFilters = [
      `trip_number.ilike.%${search}%`,
      `client_name.ilike.%${search}%`,
      `origin.ilike.%${search}%`,
      `destination.ilike.%${search}%`,
      `contract_reference.ilike.%${search}%`,
      `route.ilike.%${search}%`,
    ];
    if (routeIds.length > 0) {
      orFilters.push(`route_id.in.(${routeIds.join(',')})`);
    }
    query = query.or(orFilters.join(','));
  }

  const {data, error, count} = await query
    .order(sortColumn, {ascending, nullsFirst: false})
    .range(from, to);

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  const total = count ?? 0;

  return {
    items: (data ?? []).map((row) => mapTripRow(row as unknown as TripRow)),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function listTripsForSelect(
  supabase: SupabaseClient,
  companyId: string,
  limit = 100,
): Promise<TripSelectOption[]> {
  const {data, error} = await supabase
    .from('trips')
    .select('id, trip_number')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('trip_number', {ascending: false})
    .limit(limit);

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    tripNumber: row.trip_number,
  }));
}

export async function getTripById(
  supabase: SupabaseClient,
  companyId: string,
  tripId: string,
): Promise<Trip | null> {
  const {data, error} = await supabase
    .from('trips')
    .select(TRIP_DETAIL_COLUMNS)
    .eq('id', tripId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  if (!data) return null;
  return mapTripRow(data as unknown as TripRow);
}

async function generateTripNumber(
  supabase: SupabaseClient,
  companyId: string,
): Promise<string> {
  const {data, error} = await supabase.rpc('generate_trip_number', {
    p_company_id: companyId,
  });

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return String(data);
}

/** Status que ocupam veículo/motorista (Sprint 26.5). */
const TRIP_BUSY_STATUSES = ['planned', 'in_progress'] as const;
const ODOMETER_REFERENCE_STATUSES = ['completed', 'in_progress', 'delivering'] as const;

export async function listTripResourceAvailability(
  supabase: SupabaseClient,
  companyId: string,
): Promise<TripResourceAvailability> {
  const {data, error} = await supabase
    .from('trips')
    .select('vehicle_id, driver_id')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .in('trip_status', [...TRIP_BUSY_STATUSES]);

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return {
    busyVehicleIds: [
      ...new Set(
        (data ?? [])
          .map((row) => row.vehicle_id)
          .filter((id): id is string => typeof id === 'string'),
      ),
    ],
    busyDriverIds: [
      ...new Set(
        (data ?? [])
          .map((row) => row.driver_id)
          .filter((id): id is string => typeof id === 'string'),
      ),
    ],
  };
}

interface OdometerTripRow {
  id: string;
  trip_status: Trip['tripStatus'];
  initial_odometer_km: number | null;
  final_odometer_km: number | null;
  planned_departure_at: string | null;
  departed_at: string | null;
  started_at: string | null;
  created_at: string;
}

function formatOdometer(value: number): string {
  return value.toLocaleString('pt-BR', {maximumFractionDigits: 2});
}

function tripChronology(row: OdometerTripRow): string {
  return row.departed_at ?? row.started_at ?? row.planned_departure_at ?? row.created_at;
}

function knownOdometer(row: OdometerTripRow): number | null {
  return row.trip_status === 'completed'
    ? row.final_odometer_km
    : row.initial_odometer_km;
}

async function getVehicleOdometerContext(
  supabase: SupabaseClient,
  companyId: string,
  vehicleId: string,
  excludeTripId?: string,
): Promise<{
  initialOdometerKm: number;
  currentOdometerKm: number;
  trips: OdometerTripRow[];
}> {
  const [vehicleResult, tripsResult] = await Promise.all([
    supabase
      .from('vehicles')
      .select('initial_odometer_km, current_odometer_km')
      .eq('id', vehicleId)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .maybeSingle(),
    (() => {
      let query = supabase
        .from('trips')
        .select(
          'id, trip_status, initial_odometer_km, final_odometer_km, planned_departure_at, departed_at, started_at, created_at',
        )
        .eq('company_id', companyId)
        .eq('vehicle_id', vehicleId)
        .is('deleted_at', null)
        .in('trip_status', [...ODOMETER_REFERENCE_STATUSES]);
      if (excludeTripId) query = query.neq('id', excludeTripId);
      return query;
    })(),
  ]);

  if (vehicleResult.error || !vehicleResult.data) {
    throw new Error(
      vehicleResult.error ? mapDatabaseError(vehicleResult.error) : 'Veículo não encontrado.',
    );
  }
  if (tripsResult.error) {
    throw new Error(mapDatabaseError(tripsResult.error));
  }

  return {
    initialOdometerKm: Number(vehicleResult.data.initial_odometer_km),
    currentOdometerKm: Number(vehicleResult.data.current_odometer_km),
    trips: (tripsResult.data ?? []) as OdometerTripRow[],
  };
}

async function assertTripOdometers(
  supabase: SupabaseClient,
  companyId: string,
  input: Pick<
    CreateTripInput,
    'vehicleId' | 'initialOdometerKm' | 'finalOdometerKm' | 'plannedDepartureAt'
  >,
  current?: Trip,
): Promise<void> {
  const {initialOdometerKm, finalOdometerKm, vehicleId} = input;

  if (
    initialOdometerKm !== null &&
    finalOdometerKm !== null &&
    finalOdometerKm < initialOdometerKm
  ) {
    throw new Error('O KM final deve ser maior ou igual ao KM inicial.');
  }

  const isSameVehicleEdit = Boolean(current && current.vehicleId === vehicleId);
  if (
    isSameVehicleEdit &&
    current &&
    current.initialOdometerKm !== null &&
    (initialOdometerKm === null || initialOdometerKm < current.initialOdometerKm)
  ) {
    throw new Error('O KM inicial não pode ser reduzido ao editar uma viagem.');
  }
  if (
    isSameVehicleEdit &&
    current &&
    current.finalOdometerKm !== null &&
    (finalOdometerKm === null || finalOdometerKm < current.finalOdometerKm)
  ) {
    throw new Error('O KM final não pode ser reduzido ao editar uma viagem.');
  }

  if (!vehicleId || initialOdometerKm === null) return;

  const context = await getVehicleOdometerContext(
    supabase,
    companyId,
    vehicleId,
    current?.id,
  );
  if (!isSameVehicleEdit) {
    const reference = Math.max(
      context.currentOdometerKm,
      ...context.trips.map(knownOdometer).filter((value): value is number => value !== null),
    );
    if (initialOdometerKm < reference) {
      throw new Error(
        `O KM inicial não pode ser inferior ao último hodômetro registrado para este veículo (${formatOdometer(reference)} km).`,
      );
    }
    return;
  }

  if (!current) return;
  const targetDate =
    input.plannedDepartureAt ??
    current.departedAt ??
    current.startedAt ??
    current.plannedDepartureAt ??
    current.createdAt;
  const previousReadings = context.trips
    .filter((row) => tripChronology(row) <= targetDate)
    .map(knownOdometer)
    .filter((value): value is number => value !== null);
  const previousReference = Math.max(context.initialOdometerKm, ...previousReadings);

  if (initialOdometerKm < previousReference) {
    throw new Error(
      `O KM inicial não pode ser inferior ao último hodômetro registrado para este veículo (${formatOdometer(previousReference)} km).`,
    );
  }

  if (finalOdometerKm !== null) {
    const nextInitials = context.trips
      .filter((row) => tripChronology(row) > targetDate)
      .map((row) => row.initial_odometer_km)
      .filter((value): value is number => value !== null);
    if (nextInitials.length > 0) {
      const nextInitial = Math.min(...nextInitials);
      if (finalOdometerKm > nextInitial) {
        throw new Error(
          `O KM final não pode ultrapassar o KM inicial da próxima viagem (${formatOdometer(nextInitial)} km).`,
        );
      }
    }
  }
}

async function assertCompletionOdometer(
  supabase: SupabaseClient,
  companyId: string,
  trip: Trip,
  finalOdometerKm: number,
): Promise<void> {
  if (trip.initialOdometerKm !== null && finalOdometerKm < trip.initialOdometerKm) {
    throw new Error('O KM final deve ser maior ou igual ao KM inicial.');
  }
  if (!trip.vehicleId) return;

  const context = await getVehicleOdometerContext(
    supabase,
    companyId,
    trip.vehicleId,
    trip.id,
  );
  const reference = Math.max(
    trip.initialOdometerKm ?? 0,
    context.currentOdometerKm,
    ...context.trips.map(knownOdometer).filter((value): value is number => value !== null),
  );
  if (finalOdometerKm < reference) {
    throw new Error(
      `O KM final não pode ser inferior ao último hodômetro registrado para este veículo (${formatOdometer(reference)} km).`,
    );
  }
}

async function assertTripResourcesAvailable(
  supabase: SupabaseClient,
  companyId: string,
  options: {
    vehicleId: string | null;
    driverId: string | null;
    excludeTripId?: string;
  },
): Promise<void> {
  async function hasBusyTrip(column: 'vehicle_id' | 'driver_id', value: string) {
    let query = supabase
      .from('trips')
      .select('id')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .eq(column, value)
      .in('trip_status', [...TRIP_BUSY_STATUSES])
      .limit(1);

    if (options.excludeTripId) {
      query = query.neq('id', options.excludeTripId);
    }

    const {data, error} = await query;
    if (error) {
      throw new Error(mapDatabaseError(error));
    }
    return (data ?? []).length > 0;
  }

  if (options.vehicleId && (await hasBusyTrip('vehicle_id', options.vehicleId))) {
    throw new Error('Este veículo já possui uma viagem programada ou em andamento.');
  }

  if (options.driverId && (await hasBusyTrip('driver_id', options.driverId))) {
    throw new Error('Este motorista já possui uma viagem programada ou em andamento.');
  }
}

export async function createTrip(
  supabase: SupabaseClient,
  companyId: string,
  input: CreateTripInput,
  profileId: string,
): Promise<Trip> {
  await assertTripOdometers(supabase, companyId, input);
  await assertTripResourcesAvailable(supabase, companyId, {
    vehicleId: input.vehicleId,
    driverId: input.driverId,
  });

  const tripNumber = await generateTripNumber(supabase, companyId);
  const payload = buildTripPayload(input, profileId, true);

  const {data, error} = await supabase
    .from('trips')
    .insert({...payload, company_id: companyId, trip_number: tripNumber})
    .select(TRIP_DETAIL_COLUMNS)
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  const trip = mapTripRow(data as unknown as TripRow);
  await triggerTripCompletedIfNeeded(supabase, companyId, trip, profileId);
  return trip;
}

export async function updateTrip(
  supabase: SupabaseClient,
  companyId: string,
  tripId: string,
  input: UpdateTripInput,
  profileId: string,
): Promise<Trip> {
  const current = await getTripForLifecycle(supabase, companyId, tripId);
  await assertTripOdometers(supabase, companyId, input, current);

  const nextStatus = current.tripStatus;
  if ((TRIP_BUSY_STATUSES as readonly string[]).includes(nextStatus)) {
    await assertTripResourcesAvailable(supabase, companyId, {
      vehicleId: input.vehicleId,
      driverId: input.driverId,
      excludeTripId: tripId,
    });
  }

  const payload = buildTripPayload(input, profileId, false);
  payload.trip_status = current.tripStatus;

  const {data, error} = await supabase
    .from('trips')
    .update(payload)
    .eq('id', tripId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .select(TRIP_DETAIL_COLUMNS)
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  const trip = mapTripRow(data as unknown as TripRow);
  await triggerTripCompletedIfNeeded(supabase, companyId, trip, profileId);
  return trip;
}

export async function softDeleteTrip(
  supabase: SupabaseClient,
  companyId: string,
  tripId: string,
  profileId: string,
): Promise<void> {
  const {error} = await supabase
    .from('trips')
    .update({
      deleted_at: new Date().toISOString(),
      status: 'archived',
      updated_by: profileId,
    })
    .eq('id', tripId)
    .eq('company_id', companyId);

  if (error) {
    throw new Error(mapDatabaseError(error));
  }
}

export async function updateTripStatus(
  supabase: SupabaseClient,
  companyId: string,
  tripId: string,
  tripStatus: Trip['tripStatus'],
  profileId: string,
): Promise<Trip> {
  if (tripStatus === 'completed') {
    throw new Error('Use a ação Concluir para informar e validar o KM final.');
  }

  const {data, error} = await supabase
    .from('trips')
    .update({trip_status: tripStatus, updated_by: profileId})
    .eq('id', tripId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .select(TRIP_DETAIL_COLUMNS)
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  const trip = mapTripRow(data as unknown as TripRow);

  await triggerTripCompletedIfNeeded(supabase, companyId, trip, profileId);

  return trip;
}

async function getTripForLifecycle(
  supabase: SupabaseClient,
  companyId: string,
  tripId: string,
): Promise<Trip> {
  const trip = await getTripById(supabase, companyId, tripId);
  if (!trip) {
    throw new Error('Viagem não encontrada.');
  }
  return trip;
}

export async function startTrip(
  supabase: SupabaseClient,
  companyId: string,
  tripId: string,
  profileId: string,
): Promise<Trip> {
  const current = await getTripForLifecycle(supabase, companyId, tripId);
  if (!canStartTrip(current.tripStatus)) {
    throw new Error('Só é possível iniciar viagens programadas.');
  }

  const now = new Date().toISOString();
  const {data, error} = await supabase
    .from('trips')
    .update({
      trip_status: 'in_progress',
      started_at: current.startedAt ?? now,
      departed_at: current.departedAt ?? now,
      updated_by: profileId,
    })
    .eq('id', tripId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .select(TRIP_DETAIL_COLUMNS)
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapTripRow(data as unknown as TripRow);
}

export async function completeTrip(
  supabase: SupabaseClient,
  companyId: string,
  tripId: string,
  input: CompleteTripInput,
  profileId: string,
): Promise<Trip> {
  const current = await getTripForLifecycle(supabase, companyId, tripId);
  if (!canCompleteTrip(current.tripStatus)) {
    throw new Error('Só é possível concluir viagens em andamento.');
  }
  await assertCompletionOdometer(supabase, companyId, current, input.finalOdometerKm);

  const {data, error} = await supabase
    .from('trips')
    .update({
      trip_status: 'completed',
      completed_at: input.completedAt,
      arrived_at: current.arrivedAt ?? input.completedAt,
      final_odometer_km: input.finalOdometerKm,
      updated_by: profileId,
    })
    .eq('id', tripId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .select(TRIP_DETAIL_COLUMNS)
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  const trip = mapTripRow(data as unknown as TripRow);
  if (trip.vehicleId) {
    const {error: vehicleError} = await supabase
      .from('vehicles')
      .update({
        asset_status: 'active',
        current_odometer_km: input.finalOdometerKm,
        updated_by: profileId,
      })
      .eq('id', trip.vehicleId)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .select('id')
      .single();
    if (vehicleError) {
      throw new Error(
        `A viagem foi concluída, mas não foi possível liberar o veículo: ${mapDatabaseError(vehicleError)}`,
      );
    }

    const {error: vehicleHistoryError} = await supabase.from('vehicle_history').insert({
      company_id: companyId,
      vehicle_id: trip.vehicleId,
      action: 'Veículo liberado',
      changes: {
        trip_id: trip.id,
        completed_at: input.completedAt,
        final_odometer_km: input.finalOdometerKm,
      },
      new_asset_status: 'active',
      created_at: input.completedAt,
      created_by: profileId,
    });
    if (vehicleHistoryError) {
      throw new Error(
        `O veículo foi liberado, mas não foi possível registrar o histórico: ${mapDatabaseError(vehicleHistoryError)}`,
      );
    }
  }

  if (trip.driverId) {
    const {error: driverError} = await supabase
      .from('drivers')
      .update({
        operational_status: 'active',
        updated_by: profileId,
      })
      .eq('id', trip.driverId)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .select('id')
      .single();
    if (driverError) {
      throw new Error(
        `A viagem foi concluída, mas não foi possível liberar o motorista: ${mapDatabaseError(driverError)}`,
      );
    }

    const {error: driverHistoryError} = await supabase.from('driver_history').insert({
      company_id: companyId,
      driver_id: trip.driverId,
      action: 'Motorista liberado',
      changes: {
        trip_id: trip.id,
        completed_at: input.completedAt,
      },
      new_operational_status: 'active',
      created_at: input.completedAt,
      created_by: profileId,
    });
    if (driverHistoryError) {
      throw new Error(
        `O motorista foi liberado, mas não foi possível registrar o histórico: ${mapDatabaseError(driverHistoryError)}`,
      );
    }
  }
  await triggerTripCompletedIfNeeded(supabase, companyId, trip, profileId);
  return trip;
}

export async function cancelTrip(
  supabase: SupabaseClient,
  companyId: string,
  tripId: string,
  input: CancelTripInput,
  profileId: string,
): Promise<Trip> {
  const current = await getTripForLifecycle(supabase, companyId, tripId);
  if (!canCancelTrip(current.tripStatus)) {
    throw new Error('Esta viagem não pode ser cancelada.');
  }

  const now = new Date().toISOString();
  const {data, error} = await supabase
    .from('trips')
    .update({
      trip_status: 'cancelled',
      cancelled_at: current.cancelledAt ?? now,
      cancellation_notes: input.cancellationNotes,
      updated_by: profileId,
    })
    .eq('id', tripId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .select(TRIP_DETAIL_COLUMNS)
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapTripRow(data as unknown as TripRow);
}

export async function getTripStats(
  supabase: SupabaseClient,
  companyId: string,
): Promise<TripStats> {
  const {data, error} = await supabase.rpc('get_trip_stats', {
    p_company_id: companyId,
  });

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  const stats = (data ?? {}) as Record<string, unknown>;

  return {
    total: Number(stats.total ?? 0),
    inProgress: Number(stats.in_progress ?? 0),
    completed: Number(stats.completed ?? 0),
    cancelled: Number(stats.cancelled ?? 0),
    averageDurationHours: Number(stats.average_duration_hours ?? 0),
    totalKm: Number(stats.total_km ?? 0),
    driversOnTrip: Number(stats.drivers_on_trip ?? 0),
    vehiclesOnTrip: Number(stats.vehicles_on_trip ?? 0),
    occurrences: Number(stats.occurrences ?? 0),
    deliveriesCompleted: Number(stats.deliveries_completed ?? 0),
  };
}

export async function listTripHistory(
  supabase: SupabaseClient,
  companyId: string,
  tripId: string,
): Promise<TripHistory[]> {
  const {data, error} = await supabase
    .from('trip_history')
    .select('*')
    .eq('company_id', companyId)
    .eq('trip_id', tripId)
    .order('created_at', {ascending: false});

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return (data ?? []).map((row) =>
    mapTripHistoryRow(row as Parameters<typeof mapTripHistoryRow>[0]),
  );
}

export async function listTripDocuments(
  supabase: SupabaseClient,
  companyId: string,
  tripId: string,
): Promise<TripDocument[]> {
  const {data, error} = await supabase
    .from('trip_documents')
    .select('*')
    .eq('company_id', companyId)
    .eq('trip_id', tripId)
    .is('deleted_at', null)
    .order('created_at', {ascending: false});

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return (data ?? []).map((row) =>
    mapTripDocumentRow(row as Parameters<typeof mapTripDocumentRow>[0]),
  );
}

export async function createTripDocument(
  supabase: SupabaseClient,
  companyId: string,
  tripId: string,
  input: {
    name: string;
    fileUrl: string;
    storagePath: string;
    documentType: string;
    mimeType?: string | null;
    fileSize?: number | null;
    branchId?: string | null;
  },
  profileId: string,
): Promise<TripDocument> {
  const {data, error} = await supabase
    .from('trip_documents')
    .insert({
      company_id: companyId,
      branch_id: input.branchId ?? null,
      trip_id: tripId,
      name: input.name,
      file_url: input.fileUrl,
      storage_path: input.storagePath,
      document_type: input.documentType,
      mime_type: input.mimeType ?? null,
      file_size: input.fileSize ?? null,
      created_by: profileId,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapTripDocumentRow(data as Parameters<typeof mapTripDocumentRow>[0]);
}

export async function softDeleteTripDocument(
  supabase: SupabaseClient,
  companyId: string,
  documentId: string,
): Promise<void> {
  const {data: document, error: fetchError} = await supabase
    .from('trip_documents')
    .select('storage_path')
    .eq('id', documentId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .maybeSingle();

  if (fetchError) {
    throw new Error(mapDatabaseError(fetchError));
  }

  const {error} = await supabase
    .from('trip_documents')
    .update({deleted_at: new Date().toISOString()})
    .eq('id', documentId)
    .eq('company_id', companyId);

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  const storagePath = document?.storage_path;
  if (storagePath) {
    await supabase.storage.from(TRIP_STORAGE_BUCKET).remove([storagePath]);
  }
}

export async function getTripChecklist(
  supabase: SupabaseClient,
  companyId: string,
  tripId: string,
): Promise<TripChecklist | null> {
  const {data, error} = await supabase
    .from('trip_checklists')
    .select('*')
    .eq('company_id', companyId)
    .eq('trip_id', tripId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  if (!data) return null;
  return mapTripChecklistRow(data as Parameters<typeof mapTripChecklistRow>[0]);
}

export async function upsertTripChecklist(
  supabase: SupabaseClient,
  companyId: string,
  input: UpsertTripChecklistInput,
  profileId: string,
  branchId?: string | null,
): Promise<TripChecklist> {
  const existing = await getTripChecklist(supabase, companyId, input.tripId);

  const payload = {
    company_id: companyId,
    branch_id: branchId ?? null,
    trip_id: input.tripId,
    tires_ok: input.tiresOk ?? null,
    headlights_ok: input.headlightsOk ?? null,
    brakes_ok: input.brakesOk ?? null,
    documentation_ok: input.documentationOk ?? null,
    fuel_ok: input.fuelOk ?? null,
    odometer_reading: input.odometerReading,
    hour_meter_reading: input.hourMeterReading,
    photo_urls: input.photoUrls ?? [],
    signature_url: input.signatureUrl,
    notes: input.notes,
    completed_at: input.completedAt,
    updated_by: profileId,
  };

  if (existing) {
    const {data, error} = await supabase
      .from('trip_checklists')
      .update(payload)
      .eq('id', existing.id)
      .eq('company_id', companyId)
      .select('*')
      .single();

    if (error) throw new Error(mapDatabaseError(error));
    return mapTripChecklistRow(data as Parameters<typeof mapTripChecklistRow>[0]);
  }

  const {data, error} = await supabase
    .from('trip_checklists')
    .insert({...payload, created_by: profileId})
    .select('*')
    .single();

  if (error) throw new Error(mapDatabaseError(error));
  return mapTripChecklistRow(data as Parameters<typeof mapTripChecklistRow>[0]);
}

export async function listTripOccurrences(
  supabase: SupabaseClient,
  companyId: string,
  tripId: string,
): Promise<TripOccurrence[]> {
  const {data, error} = await supabase
    .from('trip_occurrences')
    .select('*')
    .eq('company_id', companyId)
    .eq('trip_id', tripId)
    .is('deleted_at', null)
    .order('occurred_at', {ascending: false});

  if (error) throw new Error(mapDatabaseError(error));

  return (data ?? []).map((row) =>
    mapTripOccurrenceRow(row as Parameters<typeof mapTripOccurrenceRow>[0]),
  );
}

export async function createTripOccurrence(
  supabase: SupabaseClient,
  companyId: string,
  input: CreateTripOccurrenceInput,
  profileId: string,
  branchId?: string | null,
): Promise<TripOccurrence> {
  const {data, error} = await supabase
    .from('trip_occurrences')
    .insert({
      company_id: companyId,
      branch_id: branchId ?? null,
      trip_id: input.tripId,
      occurrence_type: input.occurrenceType,
      description: input.description,
      occurred_at: input.occurredAt ?? new Date().toISOString(),
      created_by: profileId,
    })
    .select('*')
    .single();

  if (error) throw new Error(mapDatabaseError(error));
  return mapTripOccurrenceRow(data as Parameters<typeof mapTripOccurrenceRow>[0]);
}

export async function listTripExpenses(
  supabase: SupabaseClient,
  companyId: string,
  tripId: string,
): Promise<TripExpense[]> {
  const {data, error} = await supabase
    .from('trip_expenses')
    .select('*')
    .eq('company_id', companyId)
    .eq('trip_id', tripId)
    .is('deleted_at', null)
    .order('expense_date', {ascending: false});

  if (error) throw new Error(mapDatabaseError(error));

  return (data ?? []).map((row) =>
    mapTripExpenseRow(row as Parameters<typeof mapTripExpenseRow>[0]),
  );
}

export async function createTripExpense(
  supabase: SupabaseClient,
  companyId: string,
  input: CreateTripExpenseInput,
  profileId: string,
  branchId?: string | null,
): Promise<TripExpense> {
  const {data, error} = await supabase
    .from('trip_expenses')
    .insert({
      company_id: companyId,
      branch_id: branchId ?? null,
      trip_id: input.tripId,
      expense_type: input.expenseType,
      amount: input.amount,
      currency: input.currency ?? 'BRL',
      description: input.description,
      notes: input.notes,
      expense_date: input.expenseDate ?? new Date().toISOString().slice(0, 10),
      receipt_url: input.receiptUrl,
      created_by: profileId,
    })
    .select('*')
    .single();

  if (error) throw new Error(mapDatabaseError(error));
  return mapTripExpenseRow(data as Parameters<typeof mapTripExpenseRow>[0]);
}

export async function updateTripExpense(
  supabase: SupabaseClient,
  companyId: string,
  input: UpdateTripExpenseInput,
  profileId: string,
): Promise<TripExpense> {
  const {data, error} = await supabase
    .from('trip_expenses')
    .update({
      expense_type: input.expenseType,
      amount: input.amount,
      currency: input.currency ?? 'BRL',
      description: input.description,
      notes: input.notes,
      expense_date: input.expenseDate ?? new Date().toISOString().slice(0, 10),
      receipt_url: input.receiptUrl,
      updated_by: profileId,
    })
    .eq('id', input.id)
    .eq('company_id', companyId)
    .eq('trip_id', input.tripId)
    .is('deleted_at', null)
    .select('*')
    .single();

  if (error) throw new Error(mapDatabaseError(error));
  return mapTripExpenseRow(data as Parameters<typeof mapTripExpenseRow>[0]);
}

export async function softDeleteTripExpense(
  supabase: SupabaseClient,
  companyId: string,
  expenseId: string,
  profileId: string,
): Promise<void> {
  const {error} = await supabase
    .from('trip_expenses')
    .update({
      deleted_at: new Date().toISOString(),
      updated_by: profileId,
    })
    .eq('id', expenseId)
    .eq('company_id', companyId)
    .is('deleted_at', null);

  if (error) throw new Error(mapDatabaseError(error));
}

export async function listTripStops(
  supabase: SupabaseClient,
  companyId: string,
  tripId: string,
): Promise<TripStop[]> {
  const {data, error} = await supabase
    .from('trip_stops')
    .select('*')
    .eq('company_id', companyId)
    .eq('trip_id', tripId)
    .is('deleted_at', null)
    .order('stop_date', {ascending: true});

  if (error) throw new Error(mapDatabaseError(error));

  return (data ?? []).map((row) =>
    mapTripStopRow(row as Parameters<typeof mapTripStopRow>[0]),
  );
}

export async function createTripStop(
  supabase: SupabaseClient,
  companyId: string,
  input: CreateTripStopInput,
  profileId: string,
  branchId?: string | null,
): Promise<TripStop> {
  const {data, error} = await supabase
    .from('trip_stops')
    .insert({
      company_id: companyId,
      branch_id: branchId ?? null,
      trip_id: input.tripId,
      client_name: input.clientName,
      stop_date: input.stopDate,
      stop_time: input.stopTime,
      latitude: input.latitude,
      longitude: input.longitude,
      stopped_minutes: input.stoppedMinutes,
      notes: input.notes,
      created_by: profileId,
    })
    .select('*')
    .single();

  if (error) throw new Error(mapDatabaseError(error));
  return mapTripStopRow(data as Parameters<typeof mapTripStopRow>[0]);
}

export async function listTripLocations(
  supabase: SupabaseClient,
  companyId: string,
  tripId: string,
): Promise<TripLocation[]> {
  const {data, error} = await supabase
    .from('trip_locations')
    .select('*')
    .eq('company_id', companyId)
    .eq('trip_id', tripId)
    .is('deleted_at', null)
    .order('recorded_at', {ascending: true});

  if (error) throw new Error(mapDatabaseError(error));

  return (data ?? []).map((row) =>
    mapTripLocationRow(row as Parameters<typeof mapTripLocationRow>[0]),
  );
}
