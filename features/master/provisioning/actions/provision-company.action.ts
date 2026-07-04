'use server';

import {revalidatePath} from 'next/cache';

import {ROUTES} from '@/constants/routes/paths';
import {logPortalAudit, PORTAL_AUDIT_ACTIONS} from '@/features/master/audit';
import {PORTAL_ACCESS_DENIED, guardPortalOwner} from '@/lib/auth/guards';
import {zodFieldErrors} from '@/lib/validators/zod-field-errors';
import {createClient} from '@/supabase/server';

import {
  ProvisionCompanyError,
  provisionCompany,
} from '../services';
import type {ProvisionCompanyResult} from '../types';
import {provisionCompanySchema} from '../validation';

export interface ProvisionActionError {
  success: false;
  error: string;
  fieldErrors?: Record<string, string>;
  companyId?: string;
}

export interface ProvisionActionSuccess {
  success: true;
  data: ProvisionCompanyResult;
}

export type ProvisionActionResult = ProvisionActionSuccess | ProvisionActionError;

export async function provisionCompanyAction(
  input: unknown,
): Promise<ProvisionActionResult> {
  if (!(await guardPortalOwner())) {
    return {success: false, error: PORTAL_ACCESS_DENIED};
  }

  const parsed = provisionCompanySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos do formulário.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await createClient();
    const data = await provisionCompany(supabase, parsed.data);

    const {
      data: {user},
    } = await supabase.auth.getUser();

    await logPortalAudit({
      action: PORTAL_AUDIT_ACTIONS.COMPANY_CREATE,
      actorProfileId: user?.id ?? null,
      actorEmail: user?.email ?? null,
      targetType: 'company',
      targetId: data.companyId,
      targetLabel: data.companyName,
    });

    await logPortalAudit({
      action: PORTAL_AUDIT_ACTIONS.COMPANY_PROVISION,
      actorProfileId: user?.id ?? null,
      actorEmail: user?.email ?? null,
      targetType: 'company',
      targetId: data.companyId,
      targetLabel: data.companyName,
      metadata: {slug: data.slug, planSlug: parsed.data.planSlug},
    });

    revalidatePath(ROUTES.masterEmpresas);
    return {success: true, data};
  } catch (error) {
    if (error instanceof ProvisionCompanyError) {
      return {
        success: false,
        error: error.message,
        companyId: error.companyId,
      };
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Erro ao provisionar empresa.',
    };
  }
}
