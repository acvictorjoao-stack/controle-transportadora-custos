import type {SupabaseClient} from '@supabase/supabase-js';

import {DEMO_INTEGRATION_SOURCE} from './constants';
import {demoUuid} from './ids';

type DemoTable =
  | 'branches'
  | 'vehicles'
  | 'drivers'
  | 'customers'
  | 'suppliers'
  | 'routes'
  | 'trips'
  | 'fuel_records'
  | 'maintenance_records'
  | 'tires'
  | 'employees'
  | 'payroll_expenses';

export async function upsertDemoRecord(
  supabase: SupabaseClient,
  table: DemoTable,
  companyId: string,
  entity: string,
  key: string,
  payload: Record<string, unknown>,
): Promise<string> {
  const id = demoUuid(entity, key);
  const externalId = `demo-${entity}-${key}`;

  const {data: existing, error: selectError} = await supabase
    .from(table)
    .select('id')
    .eq('company_id', companyId)
    .eq('integration_source', DEMO_INTEGRATION_SOURCE)
    .eq('external_id', externalId)
    .maybeSingle();

  if (selectError) {
    throw new Error(`Falha ao consultar ${table}/${key}: ${selectError.message}`);
  }

  const row = {
    ...payload,
    id,
    company_id: companyId,
    integration_source: DEMO_INTEGRATION_SOURCE,
    external_id: externalId,
  };

  if (existing?.id) {
    const {error} = await supabase.from(table).update(row).eq('id', existing.id).eq('company_id', companyId);
    if (error) throw new Error(`Falha ao atualizar ${table}/${key}: ${error.message}`);
    return existing.id as string;
  }

  const {error} = await supabase.from(table).insert(row);
  if (error) throw new Error(`Falha ao inserir ${table}/${key}: ${error.message}`);
  return id;
}

export async function upsertDemoRecordById(
  supabase: SupabaseClient,
  table: 'employees' | 'payroll_expenses' | 'suppliers',
  companyId: string,
  entity: string,
  key: string,
  payload: Record<string, unknown>,
): Promise<string> {
  const id = demoUuid(entity, key);

  const {data: existing, error: selectError} = await supabase
    .from(table)
    .select('id')
    .eq('company_id', companyId)
    .eq('id', id)
    .maybeSingle();

  if (selectError) {
    throw new Error(`Falha ao consultar ${table}/${key}: ${selectError.message}`);
  }

  const row = {
    ...payload,
    id,
    company_id: companyId,
    metadata: {
      demo_seed_key: key,
      ...(typeof payload.metadata === 'object' && payload.metadata ? payload.metadata : {}),
    },
  };

  if (existing?.id) {
    const {error} = await supabase.from(table).update(row).eq('id', id).eq('company_id', companyId);
    if (error) throw new Error(`Falha ao atualizar ${table}/${key}: ${error.message}`);
    return id;
  }

  const {error} = await supabase.from(table).insert(row);
  if (error) throw new Error(`Falha ao inserir ${table}/${key}: ${error.message}`);
  return id;
}

export async function countByCompany(
  supabase: SupabaseClient,
  table: string,
  companyId: string,
): Promise<number> {
  const {count, error} = await supabase
    .from(table)
    .select('id', {count: 'exact', head: true})
    .eq('company_id', companyId)
    .is('deleted_at', null);

  if (error) {
    throw new Error(`Falha ao contar ${table}: ${error.message}`);
  }

  return count ?? 0;
}

export function subtractMonths(baseDate: Date, months: number): Date {
  const date = new Date(baseDate);
  date.setUTCMonth(date.getUTCMonth() - months);
  return date;
}

export function formatCompetence(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function isoDaysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString();
}

export function isoDaysAgoDate(days: number): string {
  return isoDaysAgo(days).slice(0, 10);
}
