'use server';

import {revalidatePath} from 'next/cache';

import {ROUTES} from '@/constants/routes/paths';
import {
  assertCompanyPermission,
  getCurrentCompanyId,
  getServerSupabaseClient,
  getUserCompanyMembership,
  COMPANY_ACCESS_DENIED,
} from '@/lib/auth/company';
import {zodFieldErrors} from '@/lib/validators/zod-field-errors';
import type {ActionResult} from '@/features/organization/shared/action-result';

import {
  createBranch,
  setBranchStatus,
  setHeadquarters,
  softDeleteBranch,
  updateBranch,
} from '../queries';
import type {Branch} from '../types';
import {createBranchSchema, updateBranchSchema} from '../validation';

function revalidateBranchPaths() {
  revalidatePath(ROUTES.filiais);
  revalidatePath(ROUTES.dashboard);
  revalidatePath(ROUTES.empresas);
}

async function resolveBranchAccess(
  permission: 'branches:read' | 'branches:write',
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

  const allowed = await assertCompanyPermission(supabase, companyId, permission);
  if (!allowed) {
    return {success: false, error: COMPANY_ACCESS_DENIED};
  }

  return {success: true, data: {companyId, profileId: membership.profileId}};
}

export async function createBranchAction(
  input: unknown,
): Promise<ActionResult<Branch>> {
  const resolved = await resolveBranchAccess('branches:write');
  if (!resolved.success) return resolved;

  const parsed = createBranchSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos do formulário.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const data = await createBranch(
      supabase,
      resolved.data.companyId,
      parsed.data,
      resolved.data.profileId,
    );
    revalidateBranchPaths();
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao criar filial.',
    };
  }
}

export async function updateBranchAction(
  branchId: string,
  input: unknown,
): Promise<ActionResult<Branch>> {
  const resolved = await resolveBranchAccess('branches:write');
  if (!resolved.success) return resolved;

  const parsed = updateBranchSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos do formulário.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const data = await updateBranch(
      supabase,
      resolved.data.companyId,
      branchId,
      parsed.data,
      resolved.data.profileId,
    );
    revalidateBranchPaths();
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao atualizar filial.',
    };
  }
}

export async function deleteBranchAction(
  branchId: string,
): Promise<ActionResult<void>> {
  const resolved = await resolveBranchAccess('branches:write');
  if (!resolved.success) return resolved;

  try {
    const supabase = await getServerSupabaseClient();
    await softDeleteBranch(
      supabase,
      resolved.data.companyId,
      branchId,
      resolved.data.profileId,
    );
    revalidateBranchPaths();
    return {success: true, data: undefined};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao excluir filial.',
    };
  }
}

export async function toggleBranchStatusAction(
  branchId: string,
  active: boolean,
): Promise<ActionResult<Branch>> {
  const resolved = await resolveBranchAccess('branches:write');
  if (!resolved.success) return resolved;

  try {
    const supabase = await getServerSupabaseClient();
    const data = await setBranchStatus(
      supabase,
      resolved.data.companyId,
      branchId,
      active ? 'active' : 'inactive',
      resolved.data.profileId,
    );
    revalidateBranchPaths();
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao alterar status.',
    };
  }
}

export async function setHeadquartersAction(
  branchId: string,
): Promise<ActionResult<Branch>> {
  const resolved = await resolveBranchAccess('branches:write');
  if (!resolved.success) return resolved;

  try {
    const supabase = await getServerSupabaseClient();
    const data = await setHeadquarters(
      supabase,
      resolved.data.companyId,
      branchId,
      resolved.data.profileId,
    );
    revalidateBranchPaths();
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao definir matriz.',
    };
  }
}
