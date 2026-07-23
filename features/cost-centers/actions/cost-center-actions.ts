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
  createCostCenter,
  setCostCenterStatus,
  softDeleteCostCenter,
  updateCostCenter,
} from '../queries';
import type {CostCenter} from '../types';
import {createCostCenterSchema, updateCostCenterSchema} from '../validation';

function revalidateCostCenterPaths() {
  revalidatePath(ROUTES.centrosDeCusto);
  revalidatePath(ROUTES.dashboard);
  revalidatePath(ROUTES.contasAPagar);
  revalidatePath(ROUTES.contasAReceber);
  revalidatePath(ROUTES.financeiro);
}

async function resolveCostCenterAccess(
  permission: 'financeiro:read' | 'financeiro:create' | 'financeiro:update' | 'financeiro:delete',
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

export async function createCostCenterAction(
  input: unknown,
): Promise<ActionResult<CostCenter>> {
  const resolved = await resolveCostCenterAccess('financeiro:create');
  if (!resolved.success) return resolved;

  const parsed = createCostCenterSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos do formulário.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const data = await createCostCenter(
      supabase,
      resolved.data.companyId,
      parsed.data,
      resolved.data.profileId,
    );
    revalidateCostCenterPaths();
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao criar centro de custo.',
    };
  }
}

export async function updateCostCenterAction(
  costCenterId: string,
  input: unknown,
): Promise<ActionResult<CostCenter>> {
  const resolved = await resolveCostCenterAccess('financeiro:update');
  if (!resolved.success) return resolved;

  const parsed = updateCostCenterSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos do formulário.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const data = await updateCostCenter(
      supabase,
      resolved.data.companyId,
      costCenterId,
      parsed.data,
      resolved.data.profileId,
    );
    revalidateCostCenterPaths();
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Erro ao atualizar centro de custo.',
    };
  }
}

export async function toggleCostCenterStatusAction(
  costCenterId: string,
  active: boolean,
): Promise<ActionResult<CostCenter>> {
  const resolved = await resolveCostCenterAccess('financeiro:update');
  if (!resolved.success) return resolved;

  try {
    const supabase = await getServerSupabaseClient();
    const data = await setCostCenterStatus(
      supabase,
      resolved.data.companyId,
      costCenterId,
      active ? 'active' : 'inactive',
      resolved.data.profileId,
    );
    revalidateCostCenterPaths();
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao alterar status.',
    };
  }
}

export async function deleteCostCenterAction(
  costCenterId: string,
): Promise<ActionResult<void>> {
  const resolved = await resolveCostCenterAccess('financeiro:delete');
  if (!resolved.success) return resolved;

  try {
    const supabase = await getServerSupabaseClient();
    await softDeleteCostCenter(
      supabase,
      resolved.data.companyId,
      costCenterId,
      resolved.data.profileId,
    );
    revalidateCostCenterPaths();
    return {success: true, data: undefined};
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Erro ao excluir centro de custo.',
    };
  }
}
