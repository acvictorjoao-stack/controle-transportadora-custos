import type {SupabaseClient} from '@supabase/supabase-js';

import {getRouteById, listRouteHistory} from '../queries/routes';
import type {RouteDetailData} from '../types';

export async function composeRouteDetail(
  supabase: SupabaseClient,
  companyId: string,
  routeId: string,
): Promise<RouteDetailData | null> {
  const route = await getRouteById(supabase, companyId, routeId);
  if (!route) return null;

  const history = await listRouteHistory(supabase, companyId, routeId);

  return {route, history};
}
