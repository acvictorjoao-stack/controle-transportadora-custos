'use server';

import {revalidatePath} from 'next/cache';

import {ROUTES} from '@/constants/routes/paths';
import type {ActionResult} from '@/features/organization/shared/action-result';
import {
  createAdminAuthUser,
  deleteAuthUser,
  resetAdminPassword,
  waitForProfile,
} from '@/features/master/provisioning/repositories/auth.repository';
import {generateTemporaryPassword} from '@/features/master/provisioning/services/password';
import {
  assertCompanyPermission,
  COMPANY_ACCESS_DENIED,
  getCurrentCompanyId,
  getServerSupabaseClient,
  getUserCompanyMembership,
} from '@/lib/auth/company';
import {zodFieldErrors} from '@/lib/validators/zod-field-errors';
import {createAdminClient} from '@/supabase/server/admin';

import {
  findActiveMembershipByEmail,
  getCompanyMemberById,
  getCompanyRoleById,
  listCompanyRoles,
} from '../queries';
import type {CompanyMemberListItem, CompanyRoleOption, MemberStatus} from '../types';
import {createMemberSchema, updateMemberSchema} from '../validation';

export interface MemberCredentials {
  email: string;
  temporaryPassword: string;
}

type MemberPermission = 'members:read' | 'members:write' | 'members:invite';

function revalidateMembersPath() {
  revalidatePath(ROUTES.usuarios);
}

async function resolveMemberAccess(
  permission: MemberPermission | MemberPermission[],
): Promise<ActionResult<{companyId: string; profileId: string}>> {
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    return {success: false, error: 'Empresa não encontrada.'};
  }

  const membership = await getUserCompanyMembership(supabase, companyId);
  if (!membership) {
    return {success: false, error: COMPANY_ACCESS_DENIED};
  }

  const permissions = Array.isArray(permission) ? permission : [permission];
  let allowed = false;
  for (const code of permissions) {
    if (await assertCompanyPermission(supabase, companyId, code)) {
      allowed = true;
      break;
    }
  }

  if (!allowed) {
    return {success: false, error: COMPANY_ACCESS_DENIED};
  }

  return {success: true, data: {companyId, profileId: membership.profileId}};
}

function mapAuthCreateError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('already') || lower.includes('já existe')) {
    return 'Já existe um usuário com este e-mail.';
  }
  return message;
}

export async function listCompanyRolesAction(): Promise<
  ActionResult<CompanyRoleOption[]>
> {
  const resolved = await resolveMemberAccess(['members:read', 'members:write', 'members:invite']);
  if (!resolved.success) return resolved;

  try {
    const supabase = await getServerSupabaseClient();
    const roles = await listCompanyRoles(supabase, resolved.data.companyId);
    return {success: true, data: roles};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao carregar perfis.',
    };
  }
}

export async function createCompanyMemberAction(
  input: unknown,
): Promise<ActionResult<MemberCredentials>> {
  const resolved = await resolveMemberAccess(['members:invite', 'members:write']);
  if (!resolved.success) return resolved;

  const parsed = createMemberSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos do formulário.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  const {fullName, email, phone, roleId, status} = parsed.data;
  const {companyId, profileId: actorProfileId} = resolved.data;

  try {
    const supabase = await getServerSupabaseClient();
    const role = await getCompanyRoleById(supabase, companyId, roleId);
    if (!role) {
      return {success: false, error: 'Perfil (role) inválido para esta empresa.'};
    }

    const existingMember = await findActiveMembershipByEmail(companyId, email);
    if (existingMember) {
      return {
        success: false,
        error: 'Este e-mail já está vinculado a um usuário desta empresa.',
        fieldErrors: {email: 'E-mail já cadastrado nesta empresa.'},
      };
    }

    const temporaryPassword = generateTemporaryPassword();
    let authUserId: string | undefined;

    try {
      const authUser = await createAdminAuthUser({
        email,
        password: temporaryPassword,
        fullName,
      });
      authUserId = authUser.id;

      await waitForProfile(authUser.id);

      const admin = createAdminClient();
      const profileUpdate: {
        phone: string | null;
        full_name: string;
      } = {
        phone,
        full_name: fullName.trim(),
      };

      const {error: profileError} = await admin
        .from('profiles')
        .update(profileUpdate)
        .eq('id', authUser.id);

      if (profileError) {
        throw new Error(profileError.message);
      }

      const nowIso = new Date().toISOString();
      const {error: memberError} = await supabase.from('company_members').insert({
        company_id: companyId,
        profile_id: authUser.id,
        role_id: roleId,
        status,
        invited_at: nowIso,
        accepted_at: nowIso,
        created_by: actorProfileId,
        updated_by: actorProfileId,
      });

      if (memberError) {
        throw new Error(memberError.message);
      }

      revalidateMembersPath();
      return {
        success: true,
        data: {email: authUser.email, temporaryPassword},
      };
    } catch (error) {
      if (authUserId) {
        try {
          await deleteAuthUser(authUserId);
        } catch {
          // Best-effort rollback; surface original error below.
        }
      }
      throw error;
    }
  } catch (error) {
    const message =
      error instanceof Error ? mapAuthCreateError(error.message) : 'Erro ao criar usuário.';
    return {success: false, error: message};
  }
}

export async function updateCompanyMemberAction(
  memberId: string,
  input: unknown,
): Promise<ActionResult<CompanyMemberListItem>> {
  const resolved = await resolveMemberAccess('members:write');
  if (!resolved.success) return resolved;

  const parsed = updateMemberSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos do formulário.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  const {companyId, profileId: actorProfileId} = resolved.data;

  try {
    const existing = await getCompanyMemberById(companyId, memberId);
    if (!existing) {
      return {success: false, error: 'Usuário não encontrado nesta empresa.'};
    }

    if (existing.profileId === actorProfileId && parsed.data.status === 'inactive') {
      return {
        success: false,
        error: 'Você não pode desativar o próprio usuário.',
      };
    }

    const supabase = await getServerSupabaseClient();
    const role = await getCompanyRoleById(supabase, companyId, parsed.data.roleId);
    if (!role) {
      return {success: false, error: 'Perfil (role) inválido para esta empresa.'};
    }

    if (parsed.data.email.toLowerCase() !== existing.email.toLowerCase()) {
      const duplicate = await findActiveMembershipByEmail(companyId, parsed.data.email);
      if (duplicate && duplicate.id !== existing.id) {
        return {
          success: false,
          error: 'Este e-mail já está vinculado a outro usuário desta empresa.',
          fieldErrors: {email: 'E-mail já cadastrado nesta empresa.'},
        };
      }
    }

    const admin = createAdminClient();

    const {error: profileError} = await admin
      .from('profiles')
      .update({
        full_name: parsed.data.fullName.trim(),
        email: parsed.data.email.trim(),
        phone: parsed.data.phone,
      })
      .eq('id', existing.profileId);

    if (profileError) {
      throw new Error(profileError.message);
    }

    if (parsed.data.email.trim().toLowerCase() !== existing.email.toLowerCase()) {
      const {error: authError} = await admin.auth.admin.updateUserById(
        existing.profileId,
        {email: parsed.data.email.trim()},
      );
      if (authError) {
        throw new Error(mapAuthCreateError(authError.message));
      }
    }

    const {error: memberError} = await supabase
      .from('company_members')
      .update({
        role_id: parsed.data.roleId,
        status: parsed.data.status,
        updated_by: actorProfileId,
      })
      .eq('id', memberId)
      .eq('company_id', companyId)
      .is('deleted_at', null);

    if (memberError) {
      throw new Error(memberError.message);
    }

    const updated = await getCompanyMemberById(companyId, memberId);
    if (!updated) {
      throw new Error('Usuário atualizado, mas não foi possível recarregar os dados.');
    }

    revalidateMembersPath();
    return {success: true, data: updated};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao atualizar usuário.',
    };
  }
}

export async function toggleCompanyMemberStatusAction(
  memberId: string,
  status: MemberStatus,
): Promise<ActionResult<CompanyMemberListItem>> {
  const resolved = await resolveMemberAccess('members:write');
  if (!resolved.success) return resolved;

  const {companyId, profileId: actorProfileId} = resolved.data;

  try {
    const existing = await getCompanyMemberById(companyId, memberId);
    if (!existing) {
      return {success: false, error: 'Usuário não encontrado nesta empresa.'};
    }

    if (existing.profileId === actorProfileId && status === 'inactive') {
      return {
        success: false,
        error: 'Você não pode desativar o próprio usuário.',
      };
    }

    const supabase = await getServerSupabaseClient();
    const {error} = await supabase
      .from('company_members')
      .update({
        status,
        updated_by: actorProfileId,
      })
      .eq('id', memberId)
      .eq('company_id', companyId)
      .is('deleted_at', null);

    if (error) {
      throw new Error(error.message);
    }

    const updated = await getCompanyMemberById(companyId, memberId);
    if (!updated) {
      throw new Error('Status alterado, mas não foi possível recarregar os dados.');
    }

    revalidateMembersPath();
    return {success: true, data: updated};
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Erro ao alterar status do usuário.',
    };
  }
}

export async function resetCompanyMemberPasswordAction(
  memberId: string,
): Promise<ActionResult<MemberCredentials>> {
  const resolved = await resolveMemberAccess('members:write');
  if (!resolved.success) return resolved;

  const {companyId, profileId: actorProfileId} = resolved.data;

  try {
    const existing = await getCompanyMemberById(companyId, memberId);
    if (!existing) {
      return {success: false, error: 'Usuário não encontrado nesta empresa.'};
    }

    if (existing.profileId === actorProfileId) {
      return {
        success: false,
        error:
          'Use a recuperação de senha do login para alterar a sua própria senha.',
      };
    }

    const temporaryPassword = generateTemporaryPassword();
    await resetAdminPassword(existing.profileId, temporaryPassword);

    const supabase = await getServerSupabaseClient();
    await supabase
      .from('company_members')
      .update({updated_by: actorProfileId})
      .eq('id', memberId)
      .eq('company_id', companyId)
      .is('deleted_at', null);

    revalidateMembersPath();
    return {
      success: true,
      data: {email: existing.email, temporaryPassword},
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao redefinir senha.',
    };
  }
}

export async function fetchCompanyMemberByIdAction(
  memberId: string,
): Promise<CompanyMemberListItem | null> {
  const resolved = await resolveMemberAccess('members:read');
  if (!resolved.success) return null;

  try {
    return await getCompanyMemberById(resolved.data.companyId, memberId);
  } catch {
    return null;
  }
}
