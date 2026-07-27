import type {SupabaseClient} from '@supabase/supabase-js';

import {mapDatabaseError} from '@/features/master/companies/utils/database-error';

import type {ExecutiveGoals} from '../types';
import {
  mapExecutiveGoals,
  mergeExecutiveGoalsIntoSettings,
} from '../services/goals-mapper';

export async function getCompanyExecutiveGoals(
  supabase: SupabaseClient,
  companyId: string,
): Promise<ExecutiveGoals> {
  const {data, error} = await supabase
    .from('companies')
    .select('settings')
    .eq('id', companyId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapExecutiveGoals(data?.settings);
}

export async function updateCompanyExecutiveGoals(
  supabase: SupabaseClient,
  companyId: string,
  goals: ExecutiveGoals,
): Promise<ExecutiveGoals> {
  const {data: current, error: readError} = await supabase
    .from('companies')
    .select('settings')
    .eq('id', companyId)
    .is('deleted_at', null)
    .maybeSingle();

  if (readError) {
    throw new Error(mapDatabaseError(readError));
  }

  const existing =
    current?.settings && typeof current.settings === 'object'
      ? (current.settings as Record<string, unknown>)
      : {};

  const merged = mergeExecutiveGoalsIntoSettings(existing, {
    ...mapExecutiveGoals(existing),
    ...goals,
  });

  const {data, error} = await supabase
    .from('companies')
    .update({settings: merged})
    .eq('id', companyId)
    .is('deleted_at', null)
    .select('settings')
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapExecutiveGoals(data.settings);
}
