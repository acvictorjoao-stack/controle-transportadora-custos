'use server';

import {revalidatePath} from 'next/cache';

import {ROUTES} from '@/constants/routes/paths';
import {logPortalAudit, PORTAL_AUDIT_ACTIONS} from '@/features/master/audit';
import {PORTAL_ACCESS_DENIED, guardPortalOwner} from '@/lib/auth/guards';
import {zodFieldErrors} from '@/lib/validators/zod-field-errors';
import {resetAdminPassword} from '@/features/master/provisioning/repositories/auth.repository';
import {generateTemporaryPassword} from '@/features/master/provisioning/services/password';
import {createClient} from '@/supabase/server';

import {readPlanSlugFromSettings} from '../utils/format';
import {
  getCompanyDetailById,
  getCompanySettings,
  softDeleteCompany,
  updateCompany,
  updateCompanyStatus,
} from '../queries';
import type {Company, CompanyDetail} from '../types';
import {updateCompanySchema} from '../validation';

export interface ActionError {
  success: false;
  error: string;
  fieldErrors?: Record<string, string>;
}

export interface ActionSuccess<T> {
  success: true;
  data: T;
}

export type ActionResult<T> = ActionSuccess<T> | ActionError;

export interface AdminCredentialsResult {
  adminEmail: string;
  temporaryPassword: string;
  accessUrl: string;
}

async function assertOwner(): Promise<ActionError | null> {
  if (!(await guardPortalOwner())) {
    return {success: false, error: PORTAL_ACCESS_DENIED};
  }
  return null;
}

function revalidateCompanyPaths(id?: string) {
  revalidatePath(ROUTES.master);
  revalidatePath(ROUTES.masterEmpresas);
  if (id) {
    revalidatePath(ROUTES.masterEmpresaDetail(id));
  }
}

async function getActorContext() {
  const supabase = await createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();
  return {
    profileId: user?.id ?? null,
    email: user?.email ?? null,
  };
}

export async function updateCompanyAction(
  id: string,
  input: unknown,
): Promise<ActionResult<Company>> {
  const denied = await assertOwner();
  if (denied) return denied;

  const parsed = updateCompanySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos do formulário.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await createClient();
    const existingSettings = await getCompanySettings(supabase, id);
    const data = await updateCompany(supabase, id, {
      ...parsed.data,
      existingSettings,
    });

    const actor = await getActorContext();
    const planChanged =
      parsed.data.planSlug &&
      parsed.data.planSlug !== readPlanSlugFromSettings(existingSettings);

    await logPortalAudit({
      action: PORTAL_AUDIT_ACTIONS.COMPANY_UPDATE,
      actorProfileId: actor.profileId,
      actorEmail: actor.email,
      targetType: 'company',
      targetId: id,
      targetLabel: data.legalName,
    });

    if (planChanged) {
      await logPortalAudit({
        action: PORTAL_AUDIT_ACTIONS.PLAN_CHANGE,
        actorProfileId: actor.profileId,
        actorEmail: actor.email,
        targetType: 'company',
        targetId: id,
        targetLabel: data.legalName,
        metadata: {planSlug: parsed.data.planSlug},
      });
    }

    revalidateCompanyPaths(id);
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Erro ao atualizar empresa.',
    };
  }
}

export async function suspendCompanyAction(id: string): Promise<ActionResult<Company>> {
  const denied = await assertOwner();
  if (denied) return denied;

  try {
    const supabase = await createClient();
    const data = await updateCompanyStatus(supabase, id, 'inactive');

    const actor = await getActorContext();
    await logPortalAudit({
      action: PORTAL_AUDIT_ACTIONS.COMPANY_SUSPEND,
      actorProfileId: actor.profileId,
      actorEmail: actor.email,
      targetType: 'company',
      targetId: id,
      targetLabel: data.legalName,
    });

    revalidateCompanyPaths(id);
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Erro ao suspender empresa.',
    };
  }
}

export async function reactivateCompanyAction(id: string): Promise<ActionResult<Company>> {
  const denied = await assertOwner();
  if (denied) return denied;

  try {
    const supabase = await createClient();
    const data = await updateCompanyStatus(supabase, id, 'active');

    const actor = await getActorContext();
    await logPortalAudit({
      action: PORTAL_AUDIT_ACTIONS.COMPANY_REACTIVATE,
      actorProfileId: actor.profileId,
      actorEmail: actor.email,
      targetType: 'company',
      targetId: id,
      targetLabel: data.legalName,
    });

    revalidateCompanyPaths(id);
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Erro ao reativar empresa.',
    };
  }
}

export async function deleteCompanyAction(id: string): Promise<ActionResult<void>> {
  const denied = await assertOwner();
  if (denied) return denied;

  try {
    const supabase = await createClient();
    const detail = await getCompanyDetailById(supabase, id);
    await softDeleteCompany(supabase, id);

    const actor = await getActorContext();
    await logPortalAudit({
      action: PORTAL_AUDIT_ACTIONS.COMPANY_DELETE,
      actorProfileId: actor.profileId,
      actorEmail: actor.email,
      targetType: 'company',
      targetId: id,
      targetLabel: detail?.legalName ?? id,
    });

    revalidateCompanyPaths(id);
    return {success: true, data: undefined};
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Erro ao excluir empresa.',
    };
  }
}

export async function resetAdminPasswordAction(
  companyId: string,
): Promise<ActionResult<AdminCredentialsResult>> {
  const denied = await assertOwner();
  if (denied) return denied;

  try {
    const supabase = await createClient();
    const detail = await getCompanyDetailById(supabase, companyId);

    if (!detail) {
      return {success: false, error: 'Empresa não encontrada.'};
    }

    if (!detail.admin) {
      return {success: false, error: 'Administrador principal não encontrado.'};
    }

    const temporaryPassword = generateTemporaryPassword();
    await resetAdminPassword(detail.admin.profileId, temporaryPassword);

    const actor = await getActorContext();
    await logPortalAudit({
      action: PORTAL_AUDIT_ACTIONS.PASSWORD_RESET,
      actorProfileId: actor.profileId,
      actorEmail: actor.email,
      targetType: 'company',
      targetId: companyId,
      targetLabel: detail.legalName,
      metadata: {adminEmail: detail.admin.email},
    });

    return {
      success: true,
      data: {
        adminEmail: detail.admin.email,
        temporaryPassword,
        accessUrl: detail.accessUrl,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Erro ao resetar senha.',
    };
  }
}

export async function resendCredentialsAction(
  companyId: string,
): Promise<ActionResult<AdminCredentialsResult>> {
  return resetAdminPasswordAction(companyId);
}

export async function fetchCompanyDetailById(
  id: string,
): Promise<CompanyDetail | null> {
  const denied = await assertOwner();
  if (denied) return null;

  try {
    const supabase = await createClient();
    return await getCompanyDetailById(supabase, id);
  } catch {
    return null;
  }
}
