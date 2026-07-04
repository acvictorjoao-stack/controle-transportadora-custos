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
  createFuelDocument,
  createFuelRecord,
  getFuelRecordById,
  softDeleteFuelDocument,
  softDeleteFuelRecord,
  updateFuelRecord,
} from '../queries';
import type {FuelDocument, FuelRecord} from '../types';
import {
  createFuelRecordSchema,
  updateFuelRecordSchema,
  uploadFuelFileSchema,
} from '../validation';

type FuelPermission = 'fuel:read' | 'fuel:create' | 'fuel:update' | 'fuel:delete';

function revalidateFuelPaths(fuelRecordId?: string) {
  revalidatePath(ROUTES.abastecimentos);
  revalidatePath(ROUTES.dashboard);
  if (fuelRecordId) {
    revalidatePath(ROUTES.abastecimentoDetail(fuelRecordId));
  }
}

async function resolveFuelAccess(
  permission: FuelPermission,
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

export async function createFuelRecordAction(
  input: unknown,
): Promise<ActionResult<FuelRecord>> {
  const resolved = await resolveFuelAccess('fuel:create');
  if (!resolved.success) return resolved;

  const parsed = createFuelRecordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos do formulário.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const data = await createFuelRecord(
      supabase,
      resolved.data.companyId,
      parsed.data,
      resolved.data.profileId,
    );
    revalidateFuelPaths();
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao registrar abastecimento.',
    };
  }
}

export async function updateFuelRecordAction(
  fuelRecordId: string,
  input: unknown,
): Promise<ActionResult<FuelRecord>> {
  const resolved = await resolveFuelAccess('fuel:update');
  if (!resolved.success) return resolved;

  const parsed = updateFuelRecordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos do formulário.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const data = await updateFuelRecord(
      supabase,
      resolved.data.companyId,
      fuelRecordId,
      parsed.data,
      resolved.data.profileId,
    );
    revalidateFuelPaths(fuelRecordId);
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao atualizar abastecimento.',
    };
  }
}

export async function deleteFuelRecordAction(
  fuelRecordId: string,
): Promise<ActionResult<void>> {
  const resolved = await resolveFuelAccess('fuel:delete');
  if (!resolved.success) return resolved;

  try {
    const supabase = await getServerSupabaseClient();
    await softDeleteFuelRecord(
      supabase,
      resolved.data.companyId,
      fuelRecordId,
      resolved.data.profileId,
    );
    revalidateFuelPaths(fuelRecordId);
    return {success: true, data: undefined};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao excluir abastecimento.',
    };
  }
}

export async function registerFuelFileAction(
  input: unknown,
): Promise<ActionResult<FuelDocument>> {
  const resolved = await resolveFuelAccess('fuel:update');
  if (!resolved.success) return resolved;

  const parsed = uploadFuelFileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados do arquivo inválidos.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const record = await getFuelRecordById(
      supabase,
      resolved.data.companyId,
      parsed.data.fuelRecordId,
    );

    if (!record) {
      return {success: false, error: 'Abastecimento não encontrado.'};
    }

    const data = await createFuelDocument(
      supabase,
      resolved.data.companyId,
      parsed.data.fuelRecordId,
      {
        name: parsed.data.name,
        fileUrl: parsed.data.fileUrl,
        storagePath: parsed.data.storagePath,
        documentType: parsed.data.documentType,
        mimeType: parsed.data.mimeType,
        fileSize: parsed.data.fileSize,
        branchId: record.branchId,
        vehicleId: record.vehicleId,
        driverId: record.driverId,
        tripId: record.tripId,
      },
      resolved.data.profileId,
    );

    revalidateFuelPaths(parsed.data.fuelRecordId);
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao registrar documento.',
    };
  }
}

export async function deleteFuelDocumentAction(
  documentId: string,
  fuelRecordId: string,
): Promise<ActionResult<void>> {
  const resolved = await resolveFuelAccess('fuel:delete');
  if (!resolved.success) return resolved;

  try {
    const supabase = await getServerSupabaseClient();
    await softDeleteFuelDocument(supabase, resolved.data.companyId, documentId);
    revalidateFuelPaths(fuelRecordId);
    return {success: true, data: undefined};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao excluir documento.',
    };
  }
}
