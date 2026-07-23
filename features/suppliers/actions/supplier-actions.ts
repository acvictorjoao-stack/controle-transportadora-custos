'use server';

import {revalidatePath} from 'next/cache';

import {ROUTES} from '@/constants/routes/paths';
import type {ActionResult} from '@/features/organization/shared/action-result';
import {
  assertCompanyPermission,
  COMPANY_ACCESS_DENIED,
  getCurrentCompanyId,
  getServerSupabaseClient,
  getUserCompanyMembership,
} from '@/lib/auth/company';
import {zodFieldErrors, zodValidationSummary} from '@/lib/validators/zod-field-errors';

import {
  createSupplier,
  softDeleteSupplier,
  updateSupplier,
  updateSupplierActive,
} from '../queries';
import type {Supplier} from '../types';
import {
  createSupplierSchema,
  quickCreateSupplierSchema,
  updateSupplierActiveSchema,
  updateSupplierSchema,
} from '../validation';

type SupplierPermission =
  | 'suppliers:read'
  | 'suppliers:create'
  | 'suppliers:update'
  | 'suppliers:delete';

function revalidateSupplierPaths(supplierId?: string) {
  revalidatePath(ROUTES.fornecedores);
  revalidatePath(ROUTES.manutencoes);
  revalidatePath(ROUTES.abastecimentos);
  revalidatePath(ROUTES.pneus);
  revalidatePath(ROUTES.contasAPagar);
  revalidatePath(ROUTES.financeiro);
  if (supplierId) {
    revalidatePath(ROUTES.fornecedorDetail(supplierId));
  }
}

async function resolveSupplierAccess(
  permission: SupplierPermission,
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

export async function createSupplierAction(
  input: unknown,
): Promise<ActionResult<Supplier>> {
  const resolved = await resolveSupplierAccess('suppliers:create');
  if (!resolved.success) return resolved;

  const parsed = createSupplierSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: zodValidationSummary(parsed.error.issues),
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const data = await createSupplier(
      supabase,
      resolved.data.companyId,
      parsed.data,
      resolved.data.profileId,
    );
    revalidateSupplierPaths();
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao criar fornecedor.',
    };
  }
}

/** Cadastro rápido a partir do SupplierSelect (sem sair da tela). */
export async function quickCreateSupplierAction(
  input: unknown,
): Promise<ActionResult<Supplier>> {
  const resolved = await resolveSupplierAccess('suppliers:create');
  if (!resolved.success) return resolved;

  const parsed = quickCreateSupplierSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: zodValidationSummary(parsed.error.issues),
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const data = await createSupplier(
      supabase,
      resolved.data.companyId,
      {
        ...parsed.data,
        contactName: null,
        zipCode: null,
        address: null,
        number: null,
        district: null,
        city: null,
        state: null,
        active: true,
        notes: null,
      },
      resolved.data.profileId,
    );
    revalidateSupplierPaths();
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao criar fornecedor.',
    };
  }
}

export async function updateSupplierAction(
  supplierId: string,
  input: unknown,
): Promise<ActionResult<Supplier>> {
  const resolved = await resolveSupplierAccess('suppliers:update');
  if (!resolved.success) return resolved;

  const parsed = updateSupplierSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: zodValidationSummary(parsed.error.issues),
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const data = await updateSupplier(
      supabase,
      resolved.data.companyId,
      supplierId,
      parsed.data,
      resolved.data.profileId,
    );
    revalidateSupplierPaths(supplierId);
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao atualizar fornecedor.',
    };
  }
}

export async function updateSupplierActiveAction(
  supplierId: string,
  input: unknown,
): Promise<ActionResult<Supplier>> {
  const resolved = await resolveSupplierAccess('suppliers:update');
  if (!resolved.success) return resolved;

  const parsed = updateSupplierActiveSchema.safeParse(input);
  if (!parsed.success) {
    return {success: false, error: 'Status inválido.'};
  }

  try {
    const supabase = await getServerSupabaseClient();
    const data = await updateSupplierActive(
      supabase,
      resolved.data.companyId,
      supplierId,
      parsed.data.active,
      resolved.data.profileId,
    );
    revalidateSupplierPaths(supplierId);
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao atualizar status.',
    };
  }
}

export async function deleteSupplierAction(
  supplierId: string,
): Promise<ActionResult<void>> {
  const resolved = await resolveSupplierAccess('suppliers:delete');
  if (!resolved.success) return resolved;

  try {
    const supabase = await getServerSupabaseClient();
    await softDeleteSupplier(
      supabase,
      resolved.data.companyId,
      supplierId,
      resolved.data.profileId,
    );
    revalidateSupplierPaths(supplierId);
    return {success: true, data: undefined};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao excluir fornecedor.',
    };
  }
}
