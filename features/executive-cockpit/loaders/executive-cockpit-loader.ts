import type {SupabaseClient} from '@supabase/supabase-js';

import {getOperationalDreBundle} from '@/features/dre/loaders';
import {previousPeriodFilters} from '@/features/organization/dashboard/utils/period';
import {getOperationalIntelligenceData} from '@/features/operational-intelligence/loaders/operational-intelligence-loader';
import {
  getCurrentUserId,
} from '@/lib/auth/company';

import {
  getCompanyExecutiveGoals,
  getProfileCockpitPreferences,
} from '../queries';
import type {
  CockpitPeriodPreset,
  ExecutiveCockpitData,
} from '../types';
import {DEFAULT_COCKPIT_PREFERENCES, DEFAULT_EXECUTIVE_GOALS} from '../types';
import {composeExecutiveCockpit} from '../utils/compose';
import {
  resolveCockpitPeriod,
  yearAgoPeriodFilters,
} from '../utils/period';

async function loadOpsSlice(
  supabase: SupabaseClient,
  companyId: string,
  dateFrom?: string,
  dateTo?: string,
) {
  try {
    const data = await getOperationalIntelligenceData(supabase, companyId, {
      dateFrom,
      dateTo,
    });
    return {
      slaPercent: data.kpis.slaPercent,
      averageLeadTimeMinutes: data.kpis.averageLeadTimeMinutes,
      openOccurrences: data.kpis.openOccurrences,
    };
  } catch {
    return {
      slaPercent: null as number | null,
      averageLeadTimeMinutes: null as number | null,
      openOccurrences: 0,
    };
  }
}

/**
 * Loader do Cockpit Executivo.
 * Compõe DRE + Inteligência Operacional + metas/preferências.
 * Não altera calculadoras de DRE, financeiro ou rateio.
 */
export async function getExecutiveCockpitData(
  supabase: SupabaseClient,
  companyId: string,
  periodPreset: CockpitPeriodPreset = 'mes',
): Promise<ExecutiveCockpitData> {
  const period = resolveCockpitPeriod(periodPreset);
  const previous = previousPeriodFilters(period);
  const yearAgo = yearAgoPeriodFilters(period);

  const userId = await getCurrentUserId(supabase);

  const [
    bundle,
    previousBundle,
    yearAgoBundle,
    ops,
    previousOps,
    yearAgoOps,
    goals,
    preferences,
  ] = await Promise.all([
    getOperationalDreBundle(supabase, companyId, period),
    getOperationalDreBundle(supabase, companyId, previous),
    yearAgo
      ? getOperationalDreBundle(supabase, companyId, yearAgo)
      : Promise.resolve(null),
    loadOpsSlice(supabase, companyId, period.dateFrom, period.dateTo),
    loadOpsSlice(supabase, companyId, previous.dateFrom, previous.dateTo),
    yearAgo
      ? loadOpsSlice(supabase, companyId, yearAgo.dateFrom, yearAgo.dateTo)
      : Promise.resolve({
          slaPercent: null,
          averageLeadTimeMinutes: null,
          openOccurrences: 0,
        }),
    getCompanyExecutiveGoals(supabase, companyId).catch(() => ({
      ...DEFAULT_EXECUTIVE_GOALS,
    })),
    userId
      ? getProfileCockpitPreferences(supabase, userId).catch(
          () => DEFAULT_COCKPIT_PREFERENCES,
        )
      : Promise.resolve(DEFAULT_COCKPIT_PREFERENCES),
  ]);

  const yearAgoHasData =
    yearAgoBundle != null && yearAgoBundle.dre.indicators.tripCount > 0;

  return composeExecutiveCockpit({
    periodPreset,
    period,
    dre: bundle.dre,
    previousDre: previousBundle.dre,
    yearAgoDre: yearAgoHasData ? yearAgoBundle!.dre : null,
    routes: bundle.byRoute.groups,
    previousRoutes: previousBundle.byRoute.groups,
    customers: bundle.byCustomer,
    previousCustomers: previousBundle.byCustomer,
    vehicles: bundle.byVehicle,
    slaPercent: ops.slaPercent,
    previousSlaPercent: previousOps.slaPercent,
    yearAgoSlaPercent: yearAgoHasData ? yearAgoOps.slaPercent : null,
    averageLeadTimeMinutes: ops.averageLeadTimeMinutes,
    previousAverageLeadTimeMinutes: previousOps.averageLeadTimeMinutes,
    yearAgoAverageLeadTimeMinutes: yearAgoHasData
      ? yearAgoOps.averageLeadTimeMinutes
      : null,
    openOccurrences: ops.openOccurrences,
    previousOpenOccurrences: previousOps.openOccurrences,
    yearAgoOpenOccurrences: yearAgoHasData ? yearAgoOps.openOccurrences : 0,
    goals,
    preferences,
  });
}
