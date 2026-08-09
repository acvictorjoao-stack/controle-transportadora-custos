'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';

import {ROUTES} from '@/constants/routes/paths';
import {logPortalAudit, PORTAL_AUDIT_ACTIONS} from '@/features/master/audit';
import {PORTAL_ACCESS_DENIED, guardPortalOwner} from '@/lib/auth/guards';
import {
  clearMasterActingCompany,
  setMasterActingCompany,
} from '@/lib/auth/master-company-context';
import {createClient} from '@/supabase/server';

export type MasterCompanyAccessResult =
  | {success: true}
  | {success: false; error: string};

async function getActor() {
  const supabase = await createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();
  return {
    supabase,
    profileId: user?.id ?? null,
    email: user?.email ?? null,
  };
}

/**
 * Master selects a company dashboard context.
 * companyId is validated on the server against portal owner access + active company.
 */
export async function enterCompanyAsMasterAction(
  companyId: string,
): Promise<MasterCompanyAccessResult> {
  if (!(await guardPortalOwner())) {
    return {success: false, error: PORTAL_ACCESS_DENIED};
  }

  if (!companyId || typeof companyId !== 'string') {
    return {success: false, error: 'Empresa inválida.'};
  }

  const {supabase, profileId, email} = await getActor();
  const result = await setMasterActingCompany(companyId.trim(), supabase);

  if (!result.ok) {
    return {success: false, error: result.error};
  }

  await logPortalAudit({
    action: PORTAL_AUDIT_ACTIONS.COMPANY_ACCESS,
    actorProfileId: profileId,
    actorEmail: email,
    targetType: 'company',
    targetId: result.company.companyId,
    targetLabel: result.company.companyName,
    metadata: {mode: 'enter'},
  });

  revalidatePath('/', 'layout');
  redirect(ROUTES.dashboard);
}

/**
 * Master switches to another company without logout / new Auth session.
 */
export async function switchCompanyAsMasterAction(
  companyId: string,
): Promise<MasterCompanyAccessResult> {
  if (!(await guardPortalOwner())) {
    return {success: false, error: PORTAL_ACCESS_DENIED};
  }

  if (!companyId || typeof companyId !== 'string') {
    return {success: false, error: 'Empresa inválida.'};
  }

  const {supabase, profileId, email} = await getActor();
  const result = await setMasterActingCompany(companyId.trim(), supabase);

  if (!result.ok) {
    return {success: false, error: result.error};
  }

  await logPortalAudit({
    action: PORTAL_AUDIT_ACTIONS.COMPANY_ACCESS,
    actorProfileId: profileId,
    actorEmail: email,
    targetType: 'company',
    targetId: result.company.companyId,
    targetLabel: result.company.companyName,
    metadata: {mode: 'switch'},
  });

  revalidatePath('/', 'layout');
  redirect(ROUTES.dashboard);
}

/**
 * Clears company context and returns to Portal Master. Session stays authenticated.
 */
export async function returnToMasterPortalAction(): Promise<void> {
  if (!(await guardPortalOwner())) {
    redirect(ROUTES.home);
  }

  const {supabase, profileId, email} = await getActor();
  await clearMasterActingCompany(supabase);

  await logPortalAudit({
    action: PORTAL_AUDIT_ACTIONS.COMPANY_ACCESS,
    actorProfileId: profileId,
    actorEmail: email,
    targetType: 'portal',
    targetLabel: 'Portal Master',
    metadata: {mode: 'exit'},
  });

  revalidatePath('/', 'layout');
  redirect(ROUTES.master);
}

/** Clears context then goes to company picker (Trocar empresa). */
export async function goToMasterCompanySwitcherAction(): Promise<void> {
  if (!(await guardPortalOwner())) {
    redirect(ROUTES.home);
  }

  revalidatePath('/', 'layout');
  redirect(ROUTES.acessoEmpresas);
}
