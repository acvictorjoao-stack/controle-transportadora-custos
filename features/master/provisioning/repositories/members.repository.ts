import type {SupabaseClient} from '@supabase/supabase-js';

export async function completeProvisioning(
  supabase: SupabaseClient,
  companyId: string,
  profileId: string,
): Promise<string> {
  const {data, error} = await supabase.rpc('complete_company_provisioning', {
    p_company_id: companyId,
    p_profile_id: profileId,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('Falha ao vincular administrador à empresa.');
  }

  return data as string;
}
