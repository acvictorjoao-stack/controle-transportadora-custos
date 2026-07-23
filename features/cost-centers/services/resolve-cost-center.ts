import type {SupabaseClient} from '@supabase/supabase-js';

import {OPERATIONAL_COST_CENTER_SOURCE_MODULES} from '../constants';
import type {SystemCostCenterCode} from '../types';
import {getCostCenterByCode, ensureCostCenterDefaults} from '../queries';

export type ResolveCostCenterInput = {
  /** Explicit organizational code (OPERACIONAL, ADMINISTRATIVO, …). */
  code?: string | null;
  /** Operational source_module — maps fuel/maintenance/tires/tolls/fines → OPERACIONAL. */
  sourceModule?: string | null;
};

/**
 * Central resolver for organizational cost centers.
 * No module should hardcode cost center IDs — always go through this service.
 */
export async function resolveCostCenter(
  supabase: SupabaseClient,
  companyId: string,
  input: ResolveCostCenterInput = {},
): Promise<string | null> {
  await ensureCostCenterDefaults(supabase, companyId);

  const code = resolveCostCenterCode(input);
  if (!code) return null;

  const center = await getCostCenterByCode(supabase, companyId, code);
  return center?.id ?? null;
}

/**
 * Pure mapping used by resolveCostCenter and tests.
 */
export function resolveCostCenterCode(
  input: ResolveCostCenterInput,
): SystemCostCenterCode | string | null {
  const explicit = input.code?.trim().toUpperCase();
  if (explicit) return explicit;

  const source = input.sourceModule?.trim().toLowerCase();
  if (
    source &&
    (OPERATIONAL_COST_CENTER_SOURCE_MODULES as readonly string[]).includes(source)
  ) {
    return 'OPERACIONAL';
  }

  return null;
}
