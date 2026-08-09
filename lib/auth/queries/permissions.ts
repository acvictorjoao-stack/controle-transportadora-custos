import type {SupabaseClient} from '@supabase/supabase-js';

import {getCurrentUserId} from '@/lib/auth/company';
import {getMasterActingCompanyId} from '@/lib/auth/master-company-context';
import {isPortalOwner} from '@/lib/auth/portal';

/**
 * Recupera os códigos de permissão do membro ativo na empresa.
 * Master em contexto de empresa recebe wildcard (não usa role de funcionário).
 */
export async function getCompanyMemberPermissions(
  supabase: SupabaseClient,
  companyId: string,
): Promise<string[]> {
  const userId = await getCurrentUserId(supabase);
  if (!userId) return [];

  if (await isPortalOwner(supabase)) {
    const actingCompanyId = await getMasterActingCompanyId(supabase);
    if (actingCompanyId === companyId) {
      return ['*'];
    }
  }

  const {data: member, error: memberError} = await supabase
    .from('company_members')
    .select('role_id')
    .eq('company_id', companyId)
    .eq('profile_id', userId)
    .is('deleted_at', null)
    .eq('status', 'active')
    .maybeSingle();

  if (memberError || !member) return [];

  const {data: rolePermissions, error: permissionsError} = await supabase
    .from('role_permissions')
    .select('permissions(code)')
    .eq('company_id', companyId)
    .eq('role_id', member.role_id);

  if (permissionsError || !rolePermissions) return [];

  const codes = rolePermissions
    .map((row) => {
      const permission = row.permissions as {code: string} | {code: string}[] | null;
      if (Array.isArray(permission)) {
        return permission[0]?.code;
      }
      return permission?.code;
    })
    .filter((code): code is string => Boolean(code));

  return [...new Set(codes)];
}
