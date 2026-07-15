import type {SupabaseClient} from '@supabase/supabase-js';

import {mapDatabaseError} from '@/features/master/companies/utils/database-error';

import {
  ROUTE_DETAIL_COLUMNS,
  ROUTE_LIST_COLUMNS,
  ROUTES_PAGE_SIZE,
} from '../constants';
import {mapRouteHistoryRow, mapRouteRow} from '../services/mappers';
import type {
  PaginatedRoutes,
  Route,
  RouteFilterOptions,
  RouteHistory,
  RouteListFilters,
  RouteRow,
  RouteSelectOption,
  RouteSortOptions,
} from '../types';
import type {CreateRouteInput, UpdateRouteInput} from '../validation';

export interface ListRoutesOptions {
  companyId: string;
  search?: string;
  page?: number;
  pageSize?: number;
  filters?: RouteListFilters;
  sort?: RouteSortOptions;
}

const SORT_COLUMNS: Record<NonNullable<RouteSortOptions['sortBy']>, string> = {
  name: 'name',
  origin: 'origin',
  destination: 'destination',
  route_type: 'route_type',
  planned_distance_km: 'planned_distance_km',
  operational_status: 'operational_status',
  created_at: 'created_at',
};

function sanitizeSearchTerm(value: string): string {
  return value.replace(/[%(),]/g, '').trim();
}

function buildRoutePayload(
  input: CreateRouteInput | UpdateRouteInput,
  profileId: string,
  isCreate: boolean,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: input.name,
    code: input.code,
    origin: input.origin,
    destination: input.destination,
    route_type: input.routeType,
    planned_distance_km: input.plannedDistanceKm,
    notes: input.notes,
    operational_status: input.operationalStatus ?? 'active',
    updated_by: profileId,
  };

  if (isCreate) {
    payload.created_by = profileId;
  }

  return payload;
}

export async function listRoutes(
  supabase: SupabaseClient,
  options: ListRoutesOptions,
): Promise<PaginatedRoutes> {
  const search = sanitizeSearchTerm(options.search ?? '');
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? ROUTES_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const filters = options.filters ?? {};
  const sortBy = options.sort?.sortBy ?? 'name';
  const sortOrder = options.sort?.sortOrder ?? 'asc';
  const ascending = sortOrder === 'asc';
  const sortColumn = SORT_COLUMNS[sortBy] ?? 'name';

  let query = supabase
    .from('routes')
    .select(ROUTE_LIST_COLUMNS, {count: 'exact'})
    .eq('company_id', options.companyId)
    .is('deleted_at', null);

  if (filters.operationalStatus) {
    query = query.eq('operational_status', filters.operationalStatus);
  }
  if (filters.routeType) {
    query = query.eq('route_type', filters.routeType);
  }
  if (filters.origin) {
    query = query.eq('origin', filters.origin);
  }
  if (filters.destination) {
    query = query.eq('destination', filters.destination);
  }

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,origin.ilike.%${search}%,destination.ilike.%${search}%,code.ilike.%${search}%`,
    );
  }

  const {data, error, count} = await query
    .order(sortColumn, {ascending, nullsFirst: false})
    .range(from, to);

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  const total = count ?? 0;

  return {
    items: (data ?? []).map((row) => mapRouteRow(row as unknown as RouteRow)),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function listRouteFilterOptions(
  supabase: SupabaseClient,
  companyId: string,
): Promise<RouteFilterOptions> {
  const {data, error} = await supabase
    .from('routes')
    .select('origin, destination')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('origin')
    .limit(1000);

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  const origins = new Set<string>();
  const destinations = new Set<string>();

  for (const row of data ?? []) {
    if (row.origin) origins.add(row.origin);
    if (row.destination) destinations.add(row.destination);
  }

  return {
    origins: Array.from(origins).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    destinations: Array.from(destinations).sort((a, b) => a.localeCompare(b, 'pt-BR')),
  };
}

export async function listRoutesForSelect(
  supabase: SupabaseClient,
  companyId: string,
  limit = 100,
  options?: {includeInactive?: boolean},
): Promise<RouteSelectOption[]> {
  let query = supabase
    .from('routes')
    .select(
      'id, name, code, origin, destination, planned_distance_km',
    )
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('name')
    .limit(limit);

  if (!options?.includeInactive) {
    query = query.eq('operational_status', 'active');
  }

  const {data, error} = await query;

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    code: row.code,
    origin: row.origin,
    destination: row.destination,
    plannedDistanceKm:
      row.planned_distance_km === null || row.planned_distance_km === undefined
        ? null
        : Number(row.planned_distance_km),
  }));
}

export async function getRouteById(
  supabase: SupabaseClient,
  companyId: string,
  routeId: string,
): Promise<Route | null> {
  const {data, error} = await supabase
    .from('routes')
    .select(ROUTE_DETAIL_COLUMNS)
    .eq('id', routeId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  if (!data) return null;
  return mapRouteRow(data as unknown as RouteRow);
}

export async function createRoute(
  supabase: SupabaseClient,
  companyId: string,
  input: CreateRouteInput,
  profileId: string,
): Promise<Route> {
  const payload = buildRoutePayload(input, profileId, true);

  const {data, error} = await supabase
    .from('routes')
    .insert({...payload, company_id: companyId})
    .select(ROUTE_DETAIL_COLUMNS)
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapRouteRow(data as unknown as RouteRow);
}

export async function updateRoute(
  supabase: SupabaseClient,
  companyId: string,
  routeId: string,
  input: UpdateRouteInput,
  profileId: string,
): Promise<Route> {
  const payload = buildRoutePayload(input, profileId, false);

  const {data, error} = await supabase
    .from('routes')
    .update(payload)
    .eq('id', routeId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .select(ROUTE_DETAIL_COLUMNS)
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapRouteRow(data as unknown as RouteRow);
}

export async function softDeleteRoute(
  supabase: SupabaseClient,
  companyId: string,
  routeId: string,
  profileId: string,
): Promise<void> {
  const {error} = await supabase
    .from('routes')
    .update({
      deleted_at: new Date().toISOString(),
      status: 'archived',
      updated_by: profileId,
    })
    .eq('id', routeId)
    .eq('company_id', companyId);

  if (error) {
    throw new Error(mapDatabaseError(error));
  }
}

export async function updateRouteOperationalStatus(
  supabase: SupabaseClient,
  companyId: string,
  routeId: string,
  operationalStatus: Route['operationalStatus'],
  profileId: string,
): Promise<Route> {
  const {data, error} = await supabase
    .from('routes')
    .update({operational_status: operationalStatus, updated_by: profileId})
    .eq('id', routeId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .select(ROUTE_DETAIL_COLUMNS)
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapRouteRow(data as unknown as RouteRow);
}

export async function listRouteHistory(
  supabase: SupabaseClient,
  companyId: string,
  routeId: string,
): Promise<RouteHistory[]> {
  const {data, error} = await supabase
    .from('route_history')
    .select('*')
    .eq('company_id', companyId)
    .eq('route_id', routeId)
    .order('created_at', {ascending: false});

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return (data ?? []).map((row) =>
    mapRouteHistoryRow(row as Parameters<typeof mapRouteHistoryRow>[0]),
  );
}
