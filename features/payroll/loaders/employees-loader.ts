import type {SupabaseClient} from '@supabase/supabase-js';

import {listEmployeesPaginated} from '../queries';
import type {PaginatedEmployees} from '../types';

export async function getEmployeesPage(
  supabase: SupabaseClient,
  companyId: string,
  options: {search?: string; page?: number} = {},
): Promise<PaginatedEmployees> {
  return listEmployeesPaginated(supabase, {
    companyId,
    search: options.search,
    page: options.page,
  });
}
