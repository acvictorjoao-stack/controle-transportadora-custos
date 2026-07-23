import type {SupabaseClient} from '@supabase/supabase-js';

import {mapDatabaseError} from '@/features/master/companies/utils/database-error';

import type {
  OperationalDreExpenseRow,
  OperationalDreFilters,
  OperationalDreTripDetailRow,
  OperationalDreTripRow,
} from '../types';
import {formatOperationalDreRouteLabel} from '../utils/route-label';

const DRE_TRIP_COLUMNS = `
  id, branch_id, customer_id, route_id, vehicle_id,
  contracted_freight_value, actual_freight_value,
  initial_odometer_km, final_odometer_km, planned_distance_km
`;

const DRE_TRIP_DETAIL_COLUMNS = `
  id, branch_id, customer_id, route_id, vehicle_id, driver_id,
  trip_number, completed_at, client_name,
  contracted_freight_value, actual_freight_value,
  initial_odometer_km, final_odometer_km, planned_distance_km,
  vehicles:vehicle_id (plate),
  drivers:driver_id (name),
  customers:customer_id (legal_name, trade_name),
  routes:route_id (id, name, origin, destination)
`;

const DRE_EXPENSE_COLUMNS = `
  id, amount, branch_id, customer_id, trip_id, source_module,
  fuel_record_id, maintenance_record_id, tire_id, cost_center_id,
  financial_categories:category_id (slug),
  cost_centers:cost_center_id (id, code, name)
`;

function asNumber(value: unknown): number {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : 0;
}

function computeDistanceKm(initial: number | null, final: number | null): number {
  if (initial === null || final === null) return 0;
  const diff = final - initial;
  return diff >= 0 ? diff : 0;
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

type TripRawRow = {
  id: string;
  branch_id: string | null;
  customer_id: string | null;
  route_id: string | null;
  vehicle_id: string | null;
  contracted_freight_value: number | null;
  actual_freight_value: number | null;
  initial_odometer_km: number | null;
  final_odometer_km: number | null;
  planned_distance_km: number | null;
};

type TripDetailRawRow = TripRawRow & {
  driver_id: string | null;
  trip_number: string;
  completed_at: string | null;
  client_name: string | null;
  vehicles: {plate: string} | {plate: string}[] | null;
  drivers: {name: string} | {name: string}[] | null;
  customers:
    | {legal_name: string; trade_name: string | null}
    | {legal_name: string; trade_name: string | null}[]
    | null;
  routes:
    | {id: string; name: string; origin: string; destination: string}
    | {id: string; name: string; origin: string; destination: string}[]
    | null;
};

type ExpenseRawRow = {
  id: string;
  amount: number;
  branch_id: string | null;
  customer_id: string | null;
  trip_id: string | null;
  source_module: string | null;
  fuel_record_id: string | null;
  maintenance_record_id: string | null;
  tire_id: string | null;
  cost_center_id: string | null;
  financial_categories:
    | {slug: string | null}
    | {slug: string | null}[]
    | null;
  cost_centers:
    | {id: string; code: string; name: string}
    | {id: string; code: string; name: string}[]
    | null;
};

function mapCategorySlug(
  value: ExpenseRawRow['financial_categories'],
): string | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0]?.slug ?? null;
  return value.slug ?? null;
}

function mapCostCenter(
  value: ExpenseRawRow['cost_centers'],
): {id: string; code: string; name: string} | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function mapExpenseRow(row: ExpenseRawRow): OperationalDreExpenseRow {
  const costCenter = mapCostCenter(row.cost_centers);
  return {
    id: row.id,
    amount: asNumber(row.amount),
    branchId: row.branch_id,
    customerId: row.customer_id,
    tripId: row.trip_id,
    sourceModule: row.source_module,
    categorySlug: mapCategorySlug(row.financial_categories),
    fuelRecordId: row.fuel_record_id,
    maintenanceRecordId: row.maintenance_record_id,
    tireId: row.tire_id,
    costCenterId: row.cost_center_id ?? costCenter?.id ?? null,
    costCenterCode: costCenter?.code ?? null,
    costCenterName: costCenter?.name ?? null,
  };
}

export interface FetchOperationalDreTripsOptions {
  /** Quando true, restringe a viagens sem `route_id` (grupo "Sem rota"). */
  unassignedRouteOnly?: boolean;
}

function mapTripDistance(row: TripRawRow): number {
  const odometerKm = computeDistanceKm(
    row.initial_odometer_km !== null ? asNumber(row.initial_odometer_km) : null,
    row.final_odometer_km !== null ? asNumber(row.final_odometer_km) : null,
  );
  const plannedKm =
    row.planned_distance_km !== null ? asNumber(row.planned_distance_km) : 0;
  return odometerKm > 0 ? odometerKm : plannedKm;
}

function mapTripRow(row: TripRawRow): OperationalDreTripRow {
  return {
    id: row.id,
    branchId: row.branch_id,
    customerId: row.customer_id,
    routeId: row.route_id,
    vehicleId: row.vehicle_id,
    contractedFreightValue:
      row.contracted_freight_value !== null
        ? asNumber(row.contracted_freight_value)
        : null,
    actualFreightValue:
      row.actual_freight_value !== null ? asNumber(row.actual_freight_value) : null,
    distanceKm: mapTripDistance(row),
  };
}

function applyTripFilters<T extends {
  eq: (column: string, value: string) => T;
  is: (column: string, value: null) => T;
  gte: (column: string, value: string) => T;
  lte: (column: string, value: string) => T;
}>(
  query: T,
  filters: OperationalDreFilters,
  options: FetchOperationalDreTripsOptions = {},
): T {
  let next = query;
  if (filters.branchId) next = next.eq('branch_id', filters.branchId);
  if (filters.customerId) next = next.eq('customer_id', filters.customerId);
  if (options.unassignedRouteOnly) {
    next = next.is('route_id', null);
  } else if (filters.routeId) {
    next = next.eq('route_id', filters.routeId);
  }
  if (filters.dateFrom) next = next.gte('completed_at', filters.dateFrom);
  if (filters.dateTo) {
    next = next.lte('completed_at', `${filters.dateTo}T23:59:59.999Z`);
  }
  return next;
}

/**
 * Viagens concluídas no escopo dos filtros — mesma fonte (`trips`) e a mesma
 * regra de frete (`getTripFreightValue` no calculator). Select enxuto para
 * agregação (padrão do dashboard operacional).
 */
export async function fetchOperationalDreTrips(
  supabase: SupabaseClient,
  companyId: string,
  filters: OperationalDreFilters = {},
  options: FetchOperationalDreTripsOptions = {},
): Promise<OperationalDreTripRow[]> {
  let query = supabase
    .from('trips')
    .select(DRE_TRIP_COLUMNS)
    .eq('company_id', companyId)
    .eq('trip_status', 'completed')
    .is('deleted_at', null);

  query = applyTripFilters(query, filters, options);

  const {data, error} = await query;

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return ((data ?? []) as unknown as TripRawRow[]).map(mapTripRow);
}

/**
 * Rótulos de rota em uma única query (evita N+1) para o agrupamento agregado.
 */
export async function fetchOperationalDreRouteLabels(
  supabase: SupabaseClient,
  companyId: string,
  routeIds: string[],
): Promise<Map<string, string>> {
  const uniqueIds = Array.from(new Set(routeIds.filter(Boolean)));
  const labels = new Map<string, string>();
  if (uniqueIds.length === 0) return labels;

  const {data, error} = await supabase
    .from('routes')
    .select('id, name, origin, destination')
    .eq('company_id', companyId)
    .in('id', uniqueIds);

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  for (const row of data ?? []) {
    labels.set(
      row.id,
      formatOperationalDreRouteLabel({
        origin: row.origin,
        destination: row.destination,
        name: row.name,
      }),
    );
  }

  return labels;
}

/**
 * Detalhe de viagens para expansão lazy — reutiliza filtros/fonte da DRE com
 * joins de veículo, motorista, cliente e rota.
 */
export async function fetchOperationalDreTripDetails(
  supabase: SupabaseClient,
  companyId: string,
  filters: OperationalDreFilters = {},
  options: FetchOperationalDreTripsOptions = {},
): Promise<OperationalDreTripDetailRow[]> {
  let query = supabase
    .from('trips')
    .select(DRE_TRIP_DETAIL_COLUMNS)
    .eq('company_id', companyId)
    .eq('trip_status', 'completed')
    .is('deleted_at', null)
    .order('completed_at', {ascending: true});

  query = applyTripFilters(query, filters, options);

  const {data, error} = await query;

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return ((data ?? []) as unknown as TripDetailRawRow[]).map((row) => {
    const vehicle = firstRelation(row.vehicles);
    const driver = firstRelation(row.drivers);
    const customer = firstRelation(row.customers);
    const route = firstRelation(row.routes);
    const customerLabel =
      customer?.trade_name?.trim() ||
      customer?.legal_name?.trim() ||
      row.client_name?.trim() ||
      null;

    return {
      ...mapTripRow(row),
      tripNumber: row.trip_number,
      completedAt: row.completed_at,
      driverId: row.driver_id,
      vehicleLabel: vehicle?.plate ?? null,
      driverLabel: driver?.name ?? null,
      customerLabel,
      routeLabel: route
        ? formatOperationalDreRouteLabel({
            origin: route.origin,
            destination: route.destination,
            name: route.name,
          })
        : null,
    };
  });
}

export interface FetchOperationalDreExpensesOptions {
  filters?: OperationalDreFilters;
  /** Viagens já filtradas — usadas para escopo por cliente/rota. */
  tripIds?: string[];
}

/**
 * Despesas operacionais em `financial_entries` — mesma fonte de
 * combustível/manutenção/pneus (`get_financial_stats`) e contas a pagar.
 */
export async function fetchOperationalDreExpenses(
  supabase: SupabaseClient,
  companyId: string,
  options: FetchOperationalDreExpensesOptions = {},
): Promise<OperationalDreExpenseRow[]> {
  const filters = options.filters ?? {};
  const tripIds = options.tripIds ?? [];
  const hasDimensionFilter = Boolean(filters.customerId || filters.routeId);

  // Com cliente/rota e nenhuma viagem no recorte, não há custos atribuíveis
  // (exceto despesas diretas do cliente — tratadas abaixo).
  if (hasDimensionFilter && tripIds.length === 0 && !filters.customerId) {
    return [];
  }

  let query = supabase
    .from('financial_entries')
    .select(DRE_EXPENSE_COLUMNS)
    .eq('company_id', companyId)
    .eq('entry_type', 'expense')
    .is('deleted_at', null)
    .not('entry_status', 'in', '(cancelled,reversed)');

  if (filters.branchId) query = query.eq('branch_id', filters.branchId);
  if (filters.costCenterId) query = query.eq('cost_center_id', filters.costCenterId);
  if (filters.dateFrom) query = query.gte('entry_date', filters.dateFrom);
  if (filters.dateTo) query = query.lte('entry_date', filters.dateTo);

  if (hasDimensionFilter) {
    const orParts: string[] = [];
    if (tripIds.length > 0) {
      orParts.push(`trip_id.in.(${tripIds.join(',')})`);
    }
    if (filters.customerId) {
      orParts.push(`customer_id.eq.${filters.customerId}`);
    }
    if (orParts.length === 0) return [];
    query = query.or(orParts.join(','));
  }

  const {data, error} = await query;

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return ((data ?? []) as unknown as ExpenseRawRow[]).map(mapExpenseRow);
}
