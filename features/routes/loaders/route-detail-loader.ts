import type {SupabaseClient} from '@supabase/supabase-js';

import {getRouteById, listRouteHistory} from '../queries/routes';
import type {RouteDetailData} from '../types';

export async function composeRouteDetail(
  supabase: SupabaseClient,
  companyId: string,
  routeId: string,
): Promise<RouteDetailData | null> {
  const [route, history] = await Promise.all([
    getRouteById(supabase, companyId, routeId),
    listRouteHistory(supabase, companyId, routeId),
  ]);
  if (!route) return null;

  return {route, history};
}
