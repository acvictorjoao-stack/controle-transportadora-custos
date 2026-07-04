import type {SupabaseClient} from '@supabase/supabase-js';

import {getFinancialDetail} from '../queries/financial-entries';
import type {FinancialDetailData} from '../types';

export async function composeFinancialDetail(
  supabase: SupabaseClient,
  companyId: string,
  entryId: string,
): Promise<FinancialDetailData | null> {
  return getFinancialDetail(supabase, companyId, entryId);
}
