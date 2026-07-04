import type {SupabaseClient} from '@supabase/supabase-js';

import {DEFAULT_PLAN_SLUG} from '@/features/master/plans';
import {readPlanSlugFromSettings} from '@/features/master/companies/utils/format';

import type {MasterDashboardStats, RecentSignupItem} from '../types';

function startOfCurrentMonthIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

export async function getMasterDashboardStats(
  supabase: SupabaseClient,
): Promise<MasterDashboardStats> {
  const {data, error} = await supabase
    .from('companies')
    .select('status, provision_status, created_at, settings')
    .is('deleted_at', null);

  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];
  const monthStart = startOfCurrentMonthIso();
  const planCounts: Record<string, number> = {};

  let activeCompanies = 0;
  let suspendedCompanies = 0;
  let createdThisMonth = 0;
  let provisioningErrors = 0;

  for (const row of rows) {
    if (row.status === 'active') {
      activeCompanies += 1;
    }
    if (row.status === 'inactive' || row.status === 'blocked') {
      suspendedCompanies += 1;
    }
    if (row.created_at >= monthStart) {
      createdThisMonth += 1;
    }
    if (row.provision_status === 'error') {
      provisioningErrors += 1;
    }

    const planSlug = readPlanSlugFromSettings(
      typeof row.settings === 'object' && row.settings !== null
        ? (row.settings as Record<string, unknown>)
        : {},
      DEFAULT_PLAN_SLUG,
    );
    planCounts[planSlug] = (planCounts[planSlug] ?? 0) + 1;
  }

  return {
    totalCompanies: rows.length,
    activeCompanies,
    suspendedCompanies,
    createdThisMonth,
    provisioningErrors,
    planCounts,
  };
}

export async function getRecentSignups(
  supabase: SupabaseClient,
  limit = 5,
): Promise<RecentSignupItem[]> {
  const {data, error} = await supabase
    .from('companies')
    .select('id, legal_name, trade_name, status, created_at, settings')
    .is('deleted_at', null)
    .order('created_at', {ascending: false})
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    legalName: row.legal_name,
    tradeName: row.trade_name,
    planSlug: readPlanSlugFromSettings(
      typeof row.settings === 'object' && row.settings !== null
        ? (row.settings as Record<string, unknown>)
        : {},
      DEFAULT_PLAN_SLUG,
    ),
    status: row.status,
    createdAt: row.created_at,
  }));
}
