import type {SupabaseClient} from '@supabase/supabase-js';

import {
  appendProvisionHistoryEntry,
  getCompanyDetailById,
} from '@/features/master/companies/queries/companies';
import type {CompanyAdmin} from '@/features/master/companies/types';
import {findActiveMembershipByEmail} from '@/features/organization/members/queries';
import {createAdminClient} from '@/supabase/server/admin';

import {
  createAdminAuthUser,
  deleteAuthUser,
  waitForProfile,
} from '../repositories';
import {buildCompanyAccessUrl} from '../utils/access-url';
import {generateTemporaryPassword} from './password';

const PROVISIONED_ADMIN_ROLE_NAME = 'Administrador';

export class ProvisionCompanyAdministratorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProvisionCompanyAdministratorError';
  }
}

export interface ProvisionCompanyAdministratorInput {
  companyId: string;
  fullName: string;
  email: string;
  actorProfileId: string | null;
}

export interface ProvisionCompanyAdministratorResult {
  memberId: string;
  adminEmail: string;
  temporaryPassword: string;
  accessUrl: string;
  admin: CompanyAdmin;
}

async function getAdministradorRoleId(
  companyId: string,
): Promise<string> {
  const admin = createAdminClient();
  const {data, error} = await admin
    .from('roles')
    .select('id')
    .eq('company_id', companyId)
    .eq('name', PROVISIONED_ADMIN_ROLE_NAME)
    .is('deleted_at', null)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    throw new ProvisionCompanyAdministratorError(error.message);
  }

  if (!data?.id) {
    throw new ProvisionCompanyAdministratorError(
      `Perfil ${PROVISIONED_ADMIN_ROLE_NAME} não encontrado para a empresa.`,
    );
  }

  return data.id;
}

/**
 * Provisiona o administrador principal de uma empresa existente sem membros admin.
 * Reutiliza o mesmo fluxo server-side de criação de usuário tenant:
 * createAdminAuthUser → profile (trigger) → company_members.
 */
export async function provisionCompanyAdministrator(
  supabase: SupabaseClient,
  input: ProvisionCompanyAdministratorInput,
): Promise<ProvisionCompanyAdministratorResult> {
  const detail = await getCompanyDetailById(supabase, input.companyId);

  if (!detail) {
    throw new ProvisionCompanyAdministratorError('Empresa não encontrada.');
  }

  if (detail.admin) {
    throw new ProvisionCompanyAdministratorError(
      'Esta empresa já possui administrador principal.',
    );
  }

  const existingMember = await findActiveMembershipByEmail(
    input.companyId,
    input.email,
  );
  if (existingMember) {
    throw new ProvisionCompanyAdministratorError(
      'Este e-mail já está vinculado a um usuário desta empresa.',
    );
  }

  const roleId = await getAdministradorRoleId(input.companyId);
  const temporaryPassword = generateTemporaryPassword();
  let authUserId: string | undefined;

  try {
    const authUser = await createAdminAuthUser({
      email: input.email,
      password: temporaryPassword,
      fullName: input.fullName,
    });
    authUserId = authUser.id;

    await waitForProfile(authUser.id);

    const admin = createAdminClient();
    const {error: profileError} = await admin
      .from('profiles')
      .update({
        full_name: input.fullName.trim(),
      })
      .eq('id', authUser.id);

    if (profileError) {
      throw new ProvisionCompanyAdministratorError(profileError.message);
    }

    const nowIso = new Date().toISOString();
    const {data: member, error: memberError} = await admin
      .from('company_members')
      .insert({
        company_id: input.companyId,
        profile_id: authUser.id,
        role_id: roleId,
        status: 'active',
        invited_at: nowIso,
        accepted_at: nowIso,
        created_by: input.actorProfileId,
        updated_by: input.actorProfileId,
      })
      .select('id')
      .single();

    if (memberError) {
      throw new ProvisionCompanyAdministratorError(memberError.message);
    }

    await appendProvisionHistoryEntry(supabase, input.companyId, {
      status: 'completed',
      message: `Administrador principal provisionado (${PROVISIONED_ADMIN_ROLE_NAME})`,
    });

    return {
      memberId: member.id,
      adminEmail: authUser.email,
      temporaryPassword,
      accessUrl: buildCompanyAccessUrl(detail.slug),
      admin: {
        profileId: authUser.id,
        fullName: input.fullName.trim(),
        email: authUser.email,
        lastLoginAt: null,
      },
    };
  } catch (error) {
    if (authUserId) {
      try {
        await deleteAuthUser(authUserId);
      } catch {
        // Best-effort rollback; surface original error below.
      }
    }

    if (error instanceof ProvisionCompanyAdministratorError) {
      throw error;
    }

    throw new ProvisionCompanyAdministratorError(
      error instanceof Error ? error.message : 'Erro ao provisionar administrador.',
    );
  }
}
