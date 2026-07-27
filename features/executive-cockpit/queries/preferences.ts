import type {SupabaseClient} from '@supabase/supabase-js';

import {mapDatabaseError} from '@/features/master/companies/utils/database-error';

import type {ExecutiveCockpitPreferences} from '../types';
import {
  mapCockpitPreferences,
  mergeCockpitPreferencesIntoProfile,
} from '../services/preferences-mapper';

export async function getProfileCockpitPreferences(
  supabase: SupabaseClient,
  profileId: string,
): Promise<ExecutiveCockpitPreferences> {
  const {data, error} = await supabase
    .from('profiles')
    .select('preferences')
    .eq('id', profileId)
    .maybeSingle();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapCockpitPreferences(data?.preferences);
}

export async function updateProfileCockpitPreferences(
  supabase: SupabaseClient,
  profileId: string,
  preferences: ExecutiveCockpitPreferences,
): Promise<ExecutiveCockpitPreferences> {
  const {data: current, error: readError} = await supabase
    .from('profiles')
    .select('preferences')
    .eq('id', profileId)
    .maybeSingle();

  if (readError) {
    throw new Error(mapDatabaseError(readError));
  }

  const existing =
    current?.preferences && typeof current.preferences === 'object'
      ? (current.preferences as Record<string, unknown>)
      : {};

  const merged = mergeCockpitPreferencesIntoProfile(existing, preferences);

  const {data, error} = await supabase
    .from('profiles')
    .update({preferences: merged})
    .eq('id', profileId)
    .select('preferences')
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapCockpitPreferences(data.preferences);
}
