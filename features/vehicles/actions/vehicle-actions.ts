'use server';

import {revalidatePath} from 'next/cache';

import {ROUTES} from '@/constants/routes/paths';
import type {ActionResult} from '@/features/organization/shared/action-result';
import {readPlanSlugFromSettings} from '@/features/master/companies/utils/format';
import {getPlanCatalog} from '@/features/master/plans/queries';
import {
  assertCompanyPermission,
  COMPANY_ACCESS_DENIED,
  getCurrentCompanyId,
  getServerSupabaseClient,
  getUserCompanyMembership,
} from '@/lib/auth/company';
import {zodFieldErrors} from '@/lib/validators/zod-field-errors';

import {
  countVehicles,
  createVehicle,
  createVehicleDocument,
  softDeleteVehicle,
  softDeleteVehicleDocument,
  updateVehicle,
  updateVehicleAssetStatus,
  updateVehicleFileUrl,
} from '../queries';
import type {Vehicle, VehicleDocument} from '../types';
import {
  createVehicleSchema,
  updateVehicleSchema,
  updateVehicleStatusSchema,
  uploadVehicleFileSchema,
} from '../validation';

type VehiclePermission =
  | 'vehicles:read'
  | 'vehicles:create'
  | 'vehicles:update'
  | 'vehicles:delete';

function revalidateVehiclePaths(vehicleId?: string) {
  revalidatePath(ROUTES.veiculos);
  revalidatePath(ROUTES.dashboard);
  if (vehicleId) {
    revalidatePath(ROUTES.veiculoDetail(vehicleId));
  }
}

async function resolveVehicleAccess(
  permission: VehiclePermission,
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

async function checkVehiclePlanLimit(
  supabase: Awaited<ReturnType<typeof getServerSupabaseClient>>,
  companyId: string,
): Promise<string | null> {
  const [count, companyResult, catalog] = await Promise.all([
    countVehicles(supabase, companyId),
    supabase
      .from('companies')
      .select('settings')
      .eq('id', companyId)
      .is('deleted_at', null)
      .maybeSingle(),
    getPlanCatalog(supabase),
  ]);

  if (companyResult.error) {
    return 'Não foi possível verificar o plano da empresa.';
  }

  const settings =
    companyResult.data?.settings && typeof companyResult.data.settings === 'object'
      ? (companyResult.data.settings as Record<string, unknown>)
      : {};
  const planSlug = readPlanSlugFromSettings(settings);
  const plan = catalog.find((item) => item.slug === planSlug) ?? catalog[0];
  const maxVehicles = plan?.maxVehicles ?? 5;

  if (count >= maxVehicles) {
    return `Limite de veículos do plano atingido (${maxVehicles}).`;
  }

  return null;
}

export async function createVehicleAction(
  input: unknown,
): Promise<ActionResult<Vehicle>> {
  const resolved = await resolveVehicleAccess('vehicles:create');
  if (!resolved.success) return resolved;

  const parsed = createVehicleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos do formulário.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const limitError = await checkVehiclePlanLimit(supabase, resolved.data.companyId);
    if (limitError) {
      return {success: false, error: limitError};
    }

    const data = await createVehicle(
      supabase,
      resolved.data.companyId,
      parsed.data,
      resolved.data.profileId,
    );
    revalidateVehiclePaths();
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao criar veículo.',
    };
  }
}

export async function updateVehicleAction(
  vehicleId: string,
  input: unknown,
): Promise<ActionResult<Vehicle>> {
  const resolved = await resolveVehicleAccess('vehicles:update');
  if (!resolved.success) return resolved;

  const parsed = updateVehicleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos do formulário.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const data = await updateVehicle(
      supabase,
      resolved.data.companyId,
      vehicleId,
      parsed.data,
      resolved.data.profileId,
    );
    revalidateVehiclePaths(vehicleId);
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao atualizar veículo.',
    };
  }
}

export async function deleteVehicleAction(
  vehicleId: string,
): Promise<ActionResult<void>> {
  const resolved = await resolveVehicleAccess('vehicles:delete');
  if (!resolved.success) return resolved;

  try {
    const supabase = await getServerSupabaseClient();
    await softDeleteVehicle(
      supabase,
      resolved.data.companyId,
      vehicleId,
      resolved.data.profileId,
    );
    revalidateVehiclePaths(vehicleId);
    return {success: true, data: undefined};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao excluir veículo.',
    };
  }
}

export async function updateVehicleStatusAction(
  vehicleId: string,
  input: unknown,
): Promise<ActionResult<Vehicle>> {
  const resolved = await resolveVehicleAccess('vehicles:update');
  if (!resolved.success) return resolved;

  const parsed = updateVehicleStatusSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Situação inválida.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const data = await updateVehicleAssetStatus(
      supabase,
      resolved.data.companyId,
      vehicleId,
      parsed.data.assetStatus,
      resolved.data.profileId,
    );
    revalidateVehiclePaths(vehicleId);
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao alterar situação.',
    };
  }
}

export async function registerVehicleFileAction(
  input: unknown,
): Promise<ActionResult<VehicleDocument | Vehicle>> {
  const resolved = await resolveVehicleAccess('vehicles:update');
  if (!resolved.success) return resolved;

  const parsed = uploadVehicleFileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados do arquivo inválidos.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const {vehicleId, fileUrl, storagePath, name, documentType, mimeType, fileSize} =
      parsed.data;

    if (documentType === 'photo') {
      const vehicle = await updateVehicleFileUrl(
        supabase,
        resolved.data.companyId,
        vehicleId,
        'photo_url',
        fileUrl,
        resolved.data.profileId,
        storagePath,
      );
      revalidateVehiclePaths(vehicleId);
      return {success: true, data: vehicle};
    }

    if (documentType === 'crlv') {
      const vehicle = await updateVehicleFileUrl(
        supabase,
        resolved.data.companyId,
        vehicleId,
        'crlv_url',
        fileUrl,
        resolved.data.profileId,
        storagePath,
      );
      revalidateVehiclePaths(vehicleId);
      return {success: true, data: vehicle};
    }

    const document = await createVehicleDocument(
      supabase,
      resolved.data.companyId,
      vehicleId,
      {name, fileUrl, storagePath, documentType, mimeType, fileSize},
      resolved.data.profileId,
    );
    revalidateVehiclePaths(vehicleId);
    return {success: true, data: document};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao registrar arquivo.',
    };
  }
}

export async function deleteVehicleDocumentAction(
  documentId: string,
  vehicleId: string,
): Promise<ActionResult<void>> {
  const resolved = await resolveVehicleAccess('vehicles:update');
  if (!resolved.success) return resolved;

  try {
    const supabase = await getServerSupabaseClient();
    await softDeleteVehicleDocument(
      supabase,
      resolved.data.companyId,
      documentId,
    );
    revalidateVehiclePaths(vehicleId);
    return {success: true, data: undefined};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao excluir documento.',
    };
  }
}
