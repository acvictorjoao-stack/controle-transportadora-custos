import {execSync} from 'node:child_process';

import type {SupabaseClient} from '@supabase/supabase-js';

import {createDemoSeedClient} from './client';
import {DEMO_COMPANY_SLUG, DEMO_SETTINGS_FLAG} from './constants';
import {isDemoCompanyRecord} from './validators';

const DELETE_ORDER = [
  'financial_history',
  'financial_documents',
  'financial_entries',
  // payroll_expenses: hard delete via set_config (ver deletePayrollExpensesForDemo)
  'employees',
  'fuel_history',
  'fuel_documents',
  'fuel_records',
  'maintenance_parts',
  'maintenance_services',
  'maintenance_schedules',
  'maintenance_documents',
  'maintenance_history',
  'maintenance_records',
  'tire_documents',
  'tire_recaps',
  'tire_inspections',
  'tire_movements',
  'tire_history',
  'tires',
  'trip_locations',
  'trip_stops',
  'trip_expenses',
  'trip_checklists',
  'trip_occurrences',
  'trip_documents',
  'trip_history',
  'trips',
  'route_documents',
  'route_history',
  'routes',
  'customer_history',
  'customer_documents',
  'customer_contract_items',
  'customer_contracts',
  'customer_contacts',
  'customer_addresses',
  'customers',
  'suppliers',
  'driver_documents',
  'driver_history',
  'drivers',
  'vehicle_documents',
  'vehicle_history',
  'vehicles',
  'positions',
  'cost_centers',
  'financial_cost_centers',
  'financial_categories',
  'portal_acting_companies',
  'company_members',
  'role_permissions',
  'roles',
  'branches',
] as const;

async function findDemoCompanyId(supabase: SupabaseClient): Promise<string | null> {
  const {data, error} = await supabase
    .from('companies')
    .select('id, slug, trade_name, settings')
    .eq('slug', DEMO_COMPANY_SLUG)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data?.id) return null;
  if (!isDemoCompanyRecord({
    slug: data.slug as string,
    tradeName: data.trade_name as string | null,
    settings: (data.settings as Record<string, unknown> | null) ?? null,
  })) {
    throw new Error('Empresa encontrada pelo slug demo, mas não está marcada como demo.');
  }

  return data.id as string;
}

async function deleteByCompanyId(
  supabase: SupabaseClient,
  table: string,
  companyId: string,
): Promise<void> {
  const {error} = await supabase.from(table).delete().eq('company_id', companyId);
  if (error && !error.message.includes('Could not find the table')) {
    throw new Error(`Falha ao remover ${table}: ${error.message}`);
  }
}

/**
 * Hard delete de payroll_expenses exige set_config explícito (migration 091).
 * Escopo estrito: somente company_id da DEMO.
 */
function deletePayrollExpensesForDemo(companyId: string): void {
  const sql = `select set_config('app.allow_payroll_hard_delete', 'on', true); delete from public.payroll_expenses where company_id = '${companyId}';`;
  try {
    execSync(`npx supabase db query --linked ${JSON.stringify(sql)}`, {
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
      shell: process.platform === 'win32' ? (process.env.ComSpec ?? 'cmd.exe') : '/bin/sh',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Falha ao remover payroll_expenses da DEMO: ${message}`);
  }
}

export async function runDemoReset(): Promise<{removed: boolean; companyId: string | null}> {
  const supabase = createDemoSeedClient();
  const companyId = await findDemoCompanyId(supabase);
  if (!companyId) return {removed: false, companyId: null};

  deletePayrollExpensesForDemo(companyId);

  for (const table of DELETE_ORDER) {
    await deleteByCompanyId(supabase, table, companyId);
  }

  const {error} = await supabase.from('companies').delete().eq('id', companyId).eq('slug', DEMO_COMPANY_SLUG);
  if (error) throw new Error(error.message);

  const {count} = await supabase
    .from('companies')
    .select('id', {count: 'exact', head: true})
    .contains('settings', {[DEMO_SETTINGS_FLAG]: true});

  if ((count ?? 0) > 0) {
    throw new Error('Reset incompleto: ainda existem empresas demo.');
  }

  return {removed: true, companyId};
}
