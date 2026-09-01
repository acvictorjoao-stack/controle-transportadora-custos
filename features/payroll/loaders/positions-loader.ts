import type {SupabaseClient} from '@supabase/supabase-js';

import {listPositionsPaginated} from '../queries';
import type {PaginatedPositions} from '../types';

export async function getPositionsPage(
  supabase: SupabaseClient,
  companyId: string,
  options: {search?: string; page?: number} = {},
): Promise<PaginatedPositions> {
  return listPositionsPaginated(supabase, {
    companyId,
    search: options.search,
    page: options.page,
  });
}
