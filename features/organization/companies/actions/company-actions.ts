'use server';

import {revalidatePath} from 'next/cache';

import {ROUTES} from '@/constants/routes/paths';
import {
  assertCompanyPermission,
  getCurrentCompanyId,
  getServerSupabaseClient,
  requireCompanyMembership,
  COMPANY_ACCESS_DENIED,
} from '@/lib/auth/company';
import {zodFieldErrors} from '@/lib/validators/zod-field-errors';
import type {ActionResult} from '@/features/organization/shared/action-result';

import {
  completeOnboarding,
  getCompanyRawSettings,
  updateCompanyLogoUrl,
  updateCompanyProfile,
  updateCompanySettings,
} from '../queries';
import type {CompanyProfile} from '../types';
import {
  companySettingsSchema,
  logoUrlSchema,
  updateCompanyProfileSchema,
} from '../validation';

function revalidateOrganizationPaths() {
  revalidatePath(ROUTES.dashboard);
  revalidatePath(ROUTES.empresas);
  revalidatePath(ROUTES.filiais);
  revalidatePath(ROUTES.configuracoes);
}

async function resolveWritableCompany(): Promise<
  ActionResult<{companyId: string; settings: Record<string, unknown>}>
> {
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    return {success: false, error: 'Empresa não encontrada.'};
  }

  try {
    await requireCompanyMembership(supabase, companyId);
  } catch {
    return {success: false, error: COMPANY_ACCESS_DENIED};
  }

  const canWrite = await assertCompanyPermission(
    supabase,
    companyId,
    'companies:write',
  );
  if (!canWrite) {
    return {success: false, error: COMPANY_ACCESS_DENIED};
  }

  try {
    const settings = await getCompanyRawSettings(supabase, companyId);
    return {success: true, data: {companyId, settings}};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao carregar empresa.',
    };
  }
}

export async function updateCompanyProfileAction(
  input: unknown,
): Promise<ActionResult<CompanyProfile>> {
  const resolved = await resolveWritableCompany();
  if (!resolved.success) return resolved;

  const parsed = updateCompanyProfileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos do formulário.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const data = await updateCompanyProfile(
      supabase,
      resolved.data.companyId,
      parsed.data,
    );
    revalidateOrganizationPaths();
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao salvar empresa.',
    };
  }
}

export async function updateCompanySettingsAction(
  input: unknown,
): Promise<ActionResult<CompanyProfile>> {
  const resolved = await resolveWritableCompany();
  if (!resolved.success) return resolved;

  const parsed = companySettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos de configuração.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const data = await updateCompanySettings(
      supabase,
      resolved.data.companyId,
      parsed.data,
      resolved.data.settings,
    );
    revalidateOrganizationPaths();
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao salvar configurações.',
    };
  }
}

export async function updateCompanyLogoAction(
  input: unknown,
): Promise<ActionResult<CompanyProfile>> {
  const resolved = await resolveWritableCompany();
  if (!resolved.success) return resolved;

  const parsed = logoUrlSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'URL da logo inválida.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const data = await updateCompanyLogoUrl(
      supabase,
      resolved.data.companyId,
      parsed.data.logoUrl,
    );
    revalidateOrganizationPaths();
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao atualizar logo.',
    };
  }
}

export async function completeOnboardingAction(): Promise<ActionResult<CompanyProfile>> {
  const resolved = await resolveWritableCompany();
  if (!resolved.success) return resolved;

  try {
    const supabase = await getServerSupabaseClient();
    const data = await completeOnboarding(
      supabase,
      resolved.data.companyId,
      resolved.data.settings,
    );
    revalidateOrganizationPaths();
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao concluir configuração.',
    };
  }
}
