import type {SupabaseClient} from '@supabase/supabase-js';

import type {CompanyRoleOption} from '../types';

export async function listCompanyRoles(
  supabase: SupabaseClient,
  companyId: string,
): Promise<CompanyRoleOption[]> {
  const {data, error} = await supabase
    .from('roles')
    .select('id, name, description, is_system')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .eq('status', 'active')
    .order('name', {ascending: true});

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    isSystem: row.is_system,
  }));
}

export async function getCompanyRoleById(
  supabase: SupabaseClient,
  companyId: string,
  roleId: string,
): Promise<CompanyRoleOption | null> {
  const {data, error} = await supabase
    .from('roles')
    .select('id, name, description, is_system')
    .eq('company_id', companyId)
    .eq('id', roleId)
    .is('deleted_at', null)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    isSystem: data.is_system,
  };
}
