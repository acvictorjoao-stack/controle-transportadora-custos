import type {SupabaseClient} from '@supabase/supabase-js';

import {mapDatabaseError} from '@/features/master/companies/utils/database-error';
import type {RouteOperationalStatus, RouteRow} from '@/features/routes/types';

import type {CadastroQualityRouteItem} from './types';

type RouteQualityRow = Pick<
  RouteRow,
  | 'id'
  | 'name'
  | 'code'
  | 'origin'
  | 'destination'
  | 'operational_status'
  | 'lead_time_minutes'
  | 'unload_time_minutes'
>;

function mapQualityRow(
  row: RouteQualityRow,
  companyName: string,
): CadastroQualityRouteItem {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    origin: row.origin,
    destination: row.destination,
    operationalStatus: row.operational_status as RouteOperationalStatus,
    leadTimeMinutes:
      row.lead_time_minutes == null ? null : Number(row.lead_time_minutes),
    unloadTimeMinutes:
      row.unload_time_minutes == null ? null : Number(row.unload_time_minutes),
    companyName,
    customerName: null,
  };
}

async function getCompanyDisplayName(
  supabase: SupabaseClient,
  companyId: string,
): Promise<string> {
  const {data, error} = await supabase
    .from('companies')
    .select('trade_name, legal_name')
    .eq('id', companyId)
    .maybeSingle();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return data?.trade_name?.trim() || data?.legal_name?.trim() || 'Empresa';
}

async function listActiveRoutesBase(
  supabase: SupabaseClient,
  companyId: string,
): Promise<RouteQualityRow[]> {
  const {data, error} = await supabase
    .from('routes')
    .select(
      'id, name, code, origin, destination, operational_status, lead_time_minutes, unload_time_minutes',
    )
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('name');

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return (data ?? []) as RouteQualityRow[];
}

/** Rotas ativas (não excluídas) sem Lead Time — alerta administrativo. */
export async function listRoutesWithoutLeadTime(
  supabase: SupabaseClient,
  companyId: string,
  limit = 50,
): Promise<CadastroQualityRouteItem[]> {
  const companyName = await getCompanyDisplayName(supabase, companyId);
  const {data, error} = await supabase
    .from('routes')
    .select(
      'id, name, code, origin, destination, operational_status, lead_time_minutes, unload_time_minutes',
    )
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .is('lead_time_minutes', null)
    .order('name')
    .limit(limit);

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return ((data ?? []) as RouteQualityRow[]).map((row) =>
    mapQualityRow(row, companyName),
  );
}

export async function getCadastroQualitySnapshot(
  supabase: SupabaseClient,
  companyId: string,
): Promise<{
  companyName: string;
  routes: CadastroQualityRouteItem[];
  withoutLeadTime: CadastroQualityRouteItem[];
  withoutUnloadTime: CadastroQualityRouteItem[];
  inactive: CadastroQualityRouteItem[];
  totalRoutes: number;
}> {
  const companyName = await getCompanyDisplayName(supabase, companyId);
  const rows = await listActiveRoutesBase(supabase, companyId);
  const routes = rows.map((row) => mapQualityRow(row, companyName));

  return {
    companyName,
    routes,
    withoutLeadTime: routes.filter((route) => route.leadTimeMinutes == null),
    withoutUnloadTime: routes.filter((route) => route.unloadTimeMinutes == null),
    inactive: routes.filter((route) => route.operationalStatus === 'inactive'),
    totalRoutes: routes.length,
  };
}
