import type {SupabaseClient} from '@supabase/supabase-js';

import {getDisplayName} from '@/features/master/companies/utils/format';
import {appendProvisionHistoryEntry} from '@/features/master/companies/queries/companies';

import {
  completeProvisioning,
  createAdminAuthUser,
  deleteAuthUser,
  insertCompanyForProvisioning,
  updateProvisionStatus,
  waitForProfile,
} from '../repositories';
import type {ProvisionCompanyInput, ProvisionCompanyResult} from '../types';
import {buildCompanyAccessUrl} from '../utils/access-url';
import {generateTemporaryPassword} from './password';

export class ProvisionCompanyError extends Error {
  constructor(
    message: string,
    readonly companyId?: string,
  ) {
    super(message);
    this.name = 'ProvisionCompanyError';
  }
}

/**
 * Orquestra o provisionamento completo de uma nova empresa.
 *
 * Etapas automáticas via trigger DB (após insert em companies):
 * - Filial HQ em branches
 * - Roles Super Admin, Admin, Manager, Operator + role_permissions
 *
 * Etapas deste serviço:
 * 1. Insert companies (provision_status = in_progress)
 * 2. Criar usuário Auth do administrador (service_role, server-only)
 * 3. Aguardar profile (trigger on_auth_user_created)
 * 4. RPC complete_company_provisioning → company_members + provision completed
 */
export async function provisionCompany(
  supabase: SupabaseClient,
  input: ProvisionCompanyInput,
): Promise<ProvisionCompanyResult> {
  let companyId: string | undefined;
  let authUserId: string | undefined;
  const temporaryPassword = generateTemporaryPassword();

  try {
    const company = await insertCompanyForProvisioning(supabase, input);
    companyId = company.id;

    await appendProvisionHistoryEntry(supabase, company.id, {
      status: 'in_progress',
      message: 'Provisionamento iniciado',
    });

    const authUser = await createAdminAuthUser({
      email: input.adminEmail,
      password: temporaryPassword,
      fullName: input.adminName,
    });
    authUserId = authUser.id;

    await waitForProfile(authUser.id);

    const memberId = await completeProvisioning(
      supabase,
      company.id,
      authUser.id,
    );

    await appendProvisionHistoryEntry(supabase, company.id, {
      status: 'completed',
      message: 'Provisionamento concluído com sucesso',
    });

    return {
      companyId: company.id,
      companyName: getDisplayName(company.legalName, company.tradeName),
      taxId: company.taxId,
      slug: company.slug,
      accessUrl: buildCompanyAccessUrl(company.slug),
      adminEmail: authUser.email,
      temporaryPassword,
      provisionStatus: 'completed',
      memberId,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erro desconhecido no provisionamento.';

    if (authUserId) {
      try {
        await deleteAuthUser(authUserId);
      } catch {
        // Melhor esforço — erro principal já será reportado
      }
    }

    if (companyId) {
      try {
        await updateProvisionStatus(supabase, companyId, 'error', message);
        await appendProvisionHistoryEntry(supabase, companyId, {
          status: 'error',
          message,
        });
      } catch {
        // Melhor esforço
      }
    }

    throw new ProvisionCompanyError(message, companyId);
  }
}
