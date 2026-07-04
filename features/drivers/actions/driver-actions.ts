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
  createDriver,
  createDriverDocument,
  softDeleteDriver,
  softDeleteDriverDocument,
  updateDriver,
  updateDriverOperationalStatus,
  updateDriverPhotoUrl,
} from '../queries';
import type {Driver, DriverDocument} from '../types';
import {
  createDriverSchema,
  updateDriverSchema,
  updateDriverStatusSchema,
  uploadDriverFileSchema,
} from '../validation';

type DriverPermission =
  | 'drivers:read'
  | 'drivers:create'
  | 'drivers:update'
  | 'drivers:delete';

function revalidateDriverPaths(driverId?: string) {
  revalidatePath(ROUTES.motoristas);
  revalidatePath(ROUTES.dashboard);
  if (driverId) {
    revalidatePath(ROUTES.motoristaDetail(driverId));
  }
}

async function resolveDriverAccess(
  permission: DriverPermission,
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

export async function createDriverAction(
  input: unknown,
): Promise<ActionResult<Driver>> {
  const resolved = await resolveDriverAccess('drivers:create');
  if (!resolved.success) return resolved;

  const parsed = createDriverSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos do formulário.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const data = await createDriver(
      supabase,
      resolved.data.companyId,
      parsed.data,
      resolved.data.profileId,
    );
    revalidateDriverPaths();
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao criar motorista.',
    };
  }
}

export async function updateDriverAction(
  driverId: string,
  input: unknown,
): Promise<ActionResult<Driver>> {
  const resolved = await resolveDriverAccess('drivers:update');
  if (!resolved.success) return resolved;

  const parsed = updateDriverSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos do formulário.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const data = await updateDriver(
      supabase,
      resolved.data.companyId,
      driverId,
      parsed.data,
      resolved.data.profileId,
    );
    revalidateDriverPaths(driverId);
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao atualizar motorista.',
    };
  }
}

export async function deleteDriverAction(
  driverId: string,
): Promise<ActionResult<void>> {
  const resolved = await resolveDriverAccess('drivers:delete');
  if (!resolved.success) return resolved;

  try {
    const supabase = await getServerSupabaseClient();
    await softDeleteDriver(
      supabase,
      resolved.data.companyId,
      driverId,
      resolved.data.profileId,
    );
    revalidateDriverPaths(driverId);
    return {success: true, data: undefined};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao excluir motorista.',
    };
  }
}

export async function updateDriverStatusAction(
  driverId: string,
  input: unknown,
): Promise<ActionResult<Driver>> {
  const resolved = await resolveDriverAccess('drivers:update');
  if (!resolved.success) return resolved;

  const parsed = updateDriverStatusSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Situação inválida.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const data = await updateDriverOperationalStatus(
      supabase,
      resolved.data.companyId,
      driverId,
      parsed.data.operationalStatus,
      resolved.data.profileId,
    );
    revalidateDriverPaths(driverId);
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao alterar situação.',
    };
  }
}

export async function registerDriverFileAction(
  input: unknown,
): Promise<ActionResult<DriverDocument | Driver>> {
  const resolved = await resolveDriverAccess('drivers:update');
  if (!resolved.success) return resolved;

  const parsed = uploadDriverFileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados do arquivo inválidos.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const {driverId, fileUrl, storagePath, name, documentType, mimeType, fileSize} =
      parsed.data;

    if (documentType === 'photo') {
      const driver = await updateDriverPhotoUrl(
        supabase,
        resolved.data.companyId,
        driverId,
        fileUrl,
        resolved.data.profileId,
        storagePath,
      );
      revalidateDriverPaths(driverId);
      return {success: true, data: driver};
    }

    const document = await createDriverDocument(
      supabase,
      resolved.data.companyId,
      driverId,
      {name, fileUrl, storagePath, documentType, mimeType, fileSize},
      resolved.data.profileId,
    );
    revalidateDriverPaths(driverId);
    return {success: true, data: document};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao registrar arquivo.',
    };
  }
}

export async function deleteDriverDocumentAction(
  documentId: string,
  driverId: string,
): Promise<ActionResult<void>> {
  const resolved = await resolveDriverAccess('drivers:update');
  if (!resolved.success) return resolved;

  try {
    const supabase = await getServerSupabaseClient();
    await softDeleteDriverDocument(
      supabase,
      resolved.data.companyId,
      documentId,
    );
    revalidateDriverPaths(driverId);
    return {success: true, data: undefined};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao excluir documento.',
    };
  }
}
