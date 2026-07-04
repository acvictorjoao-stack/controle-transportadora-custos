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
import {zodFieldErrors} from '@/lib/validators/zod-field-errors';

import {
  createTire,
  createTireDocument,
  createTireInspection,
  createTireMovement,
  createTireRecap,
  softDeleteTire,
  softDeleteTireDocument,
  updateTire,
} from '../queries';
import type {Tire, TireDocument, TireInspection, TireMovement, TireRecap} from '../types';
import {
  createTireInspectionSchema,
  createTireMovementSchema,
  createTireRecapSchema,
  createTireSchema,
  updateTireSchema,
  uploadTireFileSchema,
} from '../validation';

type TirePermission = 'tires:read' | 'tires:create' | 'tires:update' | 'tires:delete';

function revalidateTirePaths(tireId?: string) {
  revalidatePath(ROUTES.pneus);
  revalidatePath(ROUTES.dashboard);
  if (tireId) {
    revalidatePath(ROUTES.pneuDetail(tireId));
  }
}

async function resolveTireAccess(
  permission: TirePermission,
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

export async function createTireAction(input: unknown): Promise<ActionResult<Tire>> {
  const resolved = await resolveTireAccess('tires:create');
  if (!resolved.success) return resolved;

  const parsed = createTireSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos do formulário.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const tire = await createTire(
      supabase,
      resolved.data.companyId,
      parsed.data,
      resolved.data.profileId,
    );
    revalidateTirePaths(tire.id);
    return {success: true, data: tire};
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao criar pneu.',
    };
  }
}

export async function updateTireAction(
  tireId: string,
  input: unknown,
): Promise<ActionResult<Tire>> {
  const resolved = await resolveTireAccess('tires:update');
  if (!resolved.success) return resolved;

  const parsed = updateTireSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos do formulário.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const tire = await updateTire(
      supabase,
      resolved.data.companyId,
      tireId,
      parsed.data,
      resolved.data.profileId,
    );
    revalidateTirePaths(tireId);
    return {success: true, data: tire};
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao atualizar pneu.',
    };
  }
}

export async function deleteTireAction(tireId: string): Promise<ActionResult<void>> {
  const resolved = await resolveTireAccess('tires:delete');
  if (!resolved.success) return resolved;

  try {
    const supabase = await getServerSupabaseClient();
    await softDeleteTire(
      supabase,
      resolved.data.companyId,
      tireId,
      resolved.data.profileId,
    );
    revalidateTirePaths(tireId);
    return {success: true, data: undefined};
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao excluir pneu.',
    };
  }
}

export async function createTireMovementAction(
  input: unknown,
): Promise<ActionResult<TireMovement>> {
  const resolved = await resolveTireAccess('tires:update');
  if (!resolved.success) return resolved;

  const parsed = createTireMovementSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos da movimentação.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const movement = await createTireMovement(
      supabase,
      resolved.data.companyId,
      parsed.data,
      resolved.data.profileId,
    );
    revalidateTirePaths(parsed.data.tireId);
    return {success: true, data: movement};
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao registrar movimentação.',
    };
  }
}

export async function createTireInspectionAction(
  input: unknown,
): Promise<ActionResult<TireInspection>> {
  const resolved = await resolveTireAccess('tires:update');
  if (!resolved.success) return resolved;

  const parsed = createTireInspectionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos da inspeção.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const inspection = await createTireInspection(
      supabase,
      resolved.data.companyId,
      parsed.data,
      resolved.data.profileId,
    );
    revalidateTirePaths(parsed.data.tireId);
    return {success: true, data: inspection};
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao registrar inspeção.',
    };
  }
}

export async function createTireRecapAction(
  input: unknown,
): Promise<ActionResult<TireRecap>> {
  const resolved = await resolveTireAccess('tires:update');
  if (!resolved.success) return resolved;

  const parsed = createTireRecapSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos da recapagem.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const recap = await createTireRecap(
      supabase,
      resolved.data.companyId,
      parsed.data,
      resolved.data.profileId,
    );
    revalidateTirePaths(parsed.data.tireId);
    return {success: true, data: recap};
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao registrar recapagem.',
    };
  }
}

export async function registerTireFileAction(
  input: unknown,
): Promise<ActionResult<TireDocument>> {
  const resolved = await resolveTireAccess('tires:update');
  if (!resolved.success) return resolved;

  const parsed = uploadTireFileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados do arquivo inválidos.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const document = await createTireDocument(
      supabase,
      resolved.data.companyId,
      parsed.data,
      resolved.data.profileId,
    );
    revalidateTirePaths(parsed.data.tireId);
    return {success: true, data: document};
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao registrar documento.',
    };
  }
}

export async function deleteTireDocumentAction(
  documentId: string,
  tireId: string,
): Promise<ActionResult<void>> {
  const resolved = await resolveTireAccess('tires:update');
  if (!resolved.success) return resolved;

  try {
    const supabase = await getServerSupabaseClient();
    await softDeleteTireDocument(
      supabase,
      resolved.data.companyId,
      documentId,
      resolved.data.profileId,
    );
    revalidateTirePaths(tireId);
    return {success: true, data: undefined};
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao excluir documento.',
    };
  }
}
