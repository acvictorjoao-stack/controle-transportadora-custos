import type {SupabaseClient} from '@supabase/supabase-js';

import {FALLBACK_PLANS} from '../constants';
import type {PlanCatalogItem} from '../types';

function mapPlanRow(raw: Record<string, unknown>): PlanCatalogItem {
  return {
    slug: String(raw.slug ?? ''),
    name: String(raw.name ?? ''),
    description: String(raw.description ?? ''),
    priceMonthly: Number(raw.price_monthly ?? 0),
    priceYearly: Number(raw.price_yearly ?? 0),
    maxUsers: Number(raw.max_users ?? 0),
    maxVehicles: Number(raw.max_vehicles ?? 0),
    maxBranches: Number(raw.max_branches ?? 0),
    enabledModules: Array.isArray(raw.enabled_modules)
      ? raw.enabled_modules.map(String)
      : [],
  };
}

export async function getPlanCatalog(
  supabase: SupabaseClient,
): Promise<PlanCatalogItem[]> {
  const {data, error} = await supabase.rpc('get_plan_catalog');

  if (error || !Array.isArray(data)) {
    return FALLBACK_PLANS;
  }

  return data
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map(mapPlanRow)
    .filter((plan) => plan.slug.length > 0);
}

export function getPlanLabel(
  plans: PlanCatalogItem[],
  slug: string | null | undefined,
): string {
  if (!slug) return 'Sem plano';
  const plan = plans.find((item) => item.slug === slug);
  return plan?.name ?? slug;
}
