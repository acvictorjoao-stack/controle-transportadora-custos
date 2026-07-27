import type {SupabaseClient} from '@supabase/supabase-js';

import {getCadastroQualitySnapshot} from './queries';
import type {CadastroQualityData} from './types';

export async function getCadastroQualityData(
  supabase: SupabaseClient,
  companyId: string,
): Promise<CadastroQualityData> {
  const snapshot = await getCadastroQualitySnapshot(supabase, companyId);

  return {
    companyName: snapshot.companyName,
    summary: {
      missingLeadTime: snapshot.withoutLeadTime.length,
      missingUnloadTime: snapshot.withoutUnloadTime.length,
      inactive: snapshot.inactive.length,
      totalRoutes: snapshot.totalRoutes,
    },
    withoutLeadTime: snapshot.withoutLeadTime,
    withoutUnloadTime: snapshot.withoutUnloadTime,
    inactive: snapshot.inactive,
  };
}
