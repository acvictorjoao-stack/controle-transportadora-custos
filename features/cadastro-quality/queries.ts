import type {SupabaseClient} from '@supabase/supabase-js';

import {mapDatabaseError} from '@/features/master/companies/utils/database-error';
import type {RouteOperationalStatus, RouteRow} from '@/features/routes/types';
import {leadDaysFromStored} from '@/features/routes/utils/lead-time';

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
  | 'lead_time_days'
  | 'customer_id'
> & {
  customers?:
    | {legal_name?: string | null; trade_name?: string | null}
    | {legal_name?: string | null; trade_name?: string | null}[]
    | null;
};

function firstJoin<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapQualityRow(
  row: RouteQualityRow,
  companyName: string,
): CadastroQualityRouteItem {
  const customer = firstJoin(row.customers);
  const leadTimeDays = leadDaysFromStored({
    leadTimeDays:
      row.lead_time_days == null ? null : Number(row.lead_time_days),
    leadTimeMinutes:
      row.lead_time_minutes == null ? null : Number(row.lead_time_minutes),
  });

  return {
    id: row.id,
    name: row.name,
    code: row.code,
    origin: row.origin,
    destination: row.destination,
    operationalStatus: row.operational_status as RouteOperationalStatus,
    leadTimeDays,
    leadTimeMinutes:
      row.lead_time_minutes == null ? null : Number(row.lead_time_minutes),
    companyName,
    customerName: customer
      ? customer.trade_name?.trim() || customer.legal_name || null
      : null,
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
      'id, name, code, origin, destination, operational_status, lead_time_minutes, lead_time_days, customer_id, customers:customer_id ( legal_name, trade_name )',
    )
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('name');

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return (data ?? []) as RouteQualityRow[];
}

export async function listRoutesWithoutLeadTime(
  supabase: SupabaseClient,
  companyId: string,
  limit = 50,
): Promise<CadastroQualityRouteItem[]> {
  const snapshot = await getCadastroQualitySnapshot(supabase, companyId);
  return snapshot.withoutLeadTime.slice(0, limit);
}

export async function getCadastroQualitySnapshot(
  supabase: SupabaseClient,
  companyId: string,
): Promise<{
  companyName: string;
  routes: CadastroQualityRouteItem[];
  withoutLeadTime: CadastroQualityRouteItem[];
  inactive: CadastroQualityRouteItem[];
  totalRoutes: number;
}> {
  const companyName = await getCompanyDisplayName(supabase, companyId);
  const rows = await listActiveRoutesBase(supabase, companyId);
  const routes = rows.map((row) => mapQualityRow(row, companyName));

  return {
    companyName,
    routes,
    withoutLeadTime: routes.filter((route) => route.leadTimeDays == null),
    inactive: routes.filter((route) => route.operationalStatus === 'inactive'),
    totalRoutes: routes.length,
  };
}
