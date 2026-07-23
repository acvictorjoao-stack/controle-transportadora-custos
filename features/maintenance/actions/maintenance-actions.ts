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
  createMaintenanceDocument,
  createMaintenancePart,
  createMaintenanceRecord,
  createMaintenanceService,
  getMaintenanceRecordById,
  softDeleteMaintenanceDocument,
  softDeleteMaintenancePart,
  softDeleteMaintenanceRecord,
  softDeleteMaintenanceService,
  updateMaintenancePart,
  updateMaintenanceRecord,
  updateMaintenanceService,
} from '../queries';
import type {MaintenanceDocument, MaintenancePart, MaintenanceRecord, MaintenanceService} from '../types';
import {
  createMaintenancePartSchema,
  createMaintenanceRecordSchema,
  createMaintenanceServiceSchema,
  updateMaintenancePartSchema,
  updateMaintenanceRecordSchema,
  updateMaintenanceServiceSchema,
  uploadMaintenanceFileSchema,
} from '../validation';

type MaintenancePermission =
  | 'maintenance:read'
  | 'maintenance:create'
  | 'maintenance:update'
  | 'maintenance:delete';

function revalidateMaintenancePaths(maintenanceRecordId?: string) {
  revalidatePath(ROUTES.manutencoes);
  revalidatePath(ROUTES.dashboard);
  if (maintenanceRecordId) {
    revalidatePath(ROUTES.manutencaoDetail(maintenanceRecordId));
  }
}

async function resolveMaintenanceAccess(
  permission: MaintenancePermission,
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

async function getRecordContext(companyId: string, maintenanceRecordId: string) {
  const supabase = await getServerSupabaseClient();
  const record = await getMaintenanceRecordById(supabase, companyId, maintenanceRecordId);
  if (!record) return null;
  return {
    branchId: record.branchId,
    vehicleId: record.vehicleId,
    driverId: null,
    tripId: null,
  };
}

export async function createMaintenanceRecordAction(
  input: unknown,
): Promise<ActionResult<MaintenanceRecord>> {
  const resolved = await resolveMaintenanceAccess('maintenance:create');
  if (!resolved.success) return resolved;

  const parsed = createMaintenanceRecordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos do formulário.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const data = await createMaintenanceRecord(
      supabase,
      resolved.data.companyId,
      parsed.data,
      resolved.data.profileId,
    );
    revalidateMaintenancePaths();
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao registrar manutenção.',
    };
  }
}

export async function updateMaintenanceRecordAction(
  maintenanceRecordId: string,
  input: unknown,
): Promise<ActionResult<MaintenanceRecord>> {
  const resolved = await resolveMaintenanceAccess('maintenance:update');
  if (!resolved.success) return resolved;

  const parsed = updateMaintenanceRecordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos do formulário.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const data = await updateMaintenanceRecord(
      supabase,
      resolved.data.companyId,
      maintenanceRecordId,
      parsed.data,
      resolved.data.profileId,
    );
    revalidateMaintenancePaths(maintenanceRecordId);
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao atualizar manutenção.',
    };
  }
}

export async function deleteMaintenanceRecordAction(
  maintenanceRecordId: string,
): Promise<ActionResult<void>> {
  const resolved = await resolveMaintenanceAccess('maintenance:delete');
  if (!resolved.success) return resolved;

  try {
    const supabase = await getServerSupabaseClient();
    await softDeleteMaintenanceRecord(
      supabase,
      resolved.data.companyId,
      maintenanceRecordId,
      resolved.data.profileId,
    );
    revalidateMaintenancePaths(maintenanceRecordId);
    return {success: true, data: undefined};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao excluir manutenção.',
    };
  }
}

export async function registerMaintenanceFileAction(
  input: unknown,
): Promise<ActionResult<MaintenanceDocument>> {
  const resolved = await resolveMaintenanceAccess('maintenance:update');
  if (!resolved.success) return resolved;

  const parsed = uploadMaintenanceFileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados do arquivo inválidos.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const record = await getMaintenanceRecordById(
      supabase,
      resolved.data.companyId,
      parsed.data.maintenanceRecordId,
    );

    if (!record) {
      return {success: false, error: 'Manutenção não encontrada.'};
    }

    const data = await createMaintenanceDocument(
      supabase,
      resolved.data.companyId,
      parsed.data.maintenanceRecordId,
      {
        name: parsed.data.name,
        fileUrl: parsed.data.fileUrl,
        storagePath: parsed.data.storagePath,
        documentType: parsed.data.documentType,
        mimeType: parsed.data.mimeType,
        fileSize: parsed.data.fileSize,
        branchId: record.branchId,
        vehicleId: record.vehicleId,
        driverId: null,
        tripId: null,
      },
      resolved.data.profileId,
    );

    revalidateMaintenancePaths(parsed.data.maintenanceRecordId);
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao registrar documento.',
    };
  }
}

export async function deleteMaintenanceDocumentAction(
  documentId: string,
  maintenanceRecordId: string,
): Promise<ActionResult<void>> {
  const resolved = await resolveMaintenanceAccess('maintenance:delete');
  if (!resolved.success) return resolved;

  try {
    const supabase = await getServerSupabaseClient();
    await softDeleteMaintenanceDocument(supabase, resolved.data.companyId, documentId);
    revalidateMaintenancePaths(maintenanceRecordId);
    return {success: true, data: undefined};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao excluir documento.',
    };
  }
}

export async function createMaintenancePartAction(
  input: unknown,
): Promise<ActionResult<MaintenancePart>> {
  const resolved = await resolveMaintenanceAccess('maintenance:update');
  if (!resolved.success) return resolved;

  const parsed = createMaintenancePartSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos da peça.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const context = await getRecordContext(resolved.data.companyId, parsed.data.maintenanceRecordId);
    if (!context) return {success: false, error: 'Manutenção não encontrada.'};

    const supabase = await getServerSupabaseClient();
    const data = await createMaintenancePart(
      supabase,
      resolved.data.companyId,
      parsed.data,
      resolved.data.profileId,
      context,
    );
    revalidateMaintenancePaths(parsed.data.maintenanceRecordId);
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao adicionar peça.',
    };
  }
}

export async function updateMaintenancePartAction(
  partId: string,
  maintenanceRecordId: string,
  input: unknown,
): Promise<ActionResult<MaintenancePart>> {
  const resolved = await resolveMaintenanceAccess('maintenance:update');
  if (!resolved.success) return resolved;

  const parsed = updateMaintenancePartSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos da peça.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  const context = await getRecordContext(resolved.data.companyId, maintenanceRecordId);
  if (!context) return {success: false, error: 'Manutenção não encontrada.'};

  try {
    const supabase = await getServerSupabaseClient();
    const data = await updateMaintenancePart(
      supabase,
      resolved.data.companyId,
      partId,
      parsed.data,
      resolved.data.profileId,
    );
    revalidateMaintenancePaths(maintenanceRecordId);
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao atualizar peça.',
    };
  }
}

export async function deleteMaintenancePartAction(
  partId: string,
  maintenanceRecordId: string,
): Promise<ActionResult<void>> {
  const resolved = await resolveMaintenanceAccess('maintenance:delete');
  if (!resolved.success) return resolved;

  const context = await getRecordContext(resolved.data.companyId, maintenanceRecordId);
  if (!context) return {success: false, error: 'Manutenção não encontrada.'};

  try {
    const supabase = await getServerSupabaseClient();
    await softDeleteMaintenancePart(
      supabase,
      resolved.data.companyId,
      partId,
      resolved.data.profileId,
    );
    revalidateMaintenancePaths(maintenanceRecordId);
    return {success: true, data: undefined};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao excluir peça.',
    };
  }
}

export async function createMaintenanceServiceAction(
  input: unknown,
): Promise<ActionResult<MaintenanceService>> {
  const resolved = await resolveMaintenanceAccess('maintenance:update');
  if (!resolved.success) return resolved;

  const parsed = createMaintenanceServiceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos do serviço.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const context = await getRecordContext(resolved.data.companyId, parsed.data.maintenanceRecordId);
    if (!context) return {success: false, error: 'Manutenção não encontrada.'};

    const supabase = await getServerSupabaseClient();
    const data = await createMaintenanceService(
      supabase,
      resolved.data.companyId,
      parsed.data,
      resolved.data.profileId,
      context,
    );
    revalidateMaintenancePaths(parsed.data.maintenanceRecordId);
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao adicionar serviço.',
    };
  }
}

export async function updateMaintenanceServiceAction(
  serviceId: string,
  maintenanceRecordId: string,
  input: unknown,
): Promise<ActionResult<MaintenanceService>> {
  const resolved = await resolveMaintenanceAccess('maintenance:update');
  if (!resolved.success) return resolved;

  const parsed = updateMaintenanceServiceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos do serviço.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  const context = await getRecordContext(resolved.data.companyId, maintenanceRecordId);
  if (!context) return {success: false, error: 'Manutenção não encontrada.'};

  try {
    const supabase = await getServerSupabaseClient();
    const data = await updateMaintenanceService(
      supabase,
      resolved.data.companyId,
      serviceId,
      parsed.data,
      resolved.data.profileId,
    );
    revalidateMaintenancePaths(maintenanceRecordId);
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao atualizar serviço.',
    };
  }
}

export async function deleteMaintenanceServiceAction(
  serviceId: string,
  maintenanceRecordId: string,
): Promise<ActionResult<void>> {
  const resolved = await resolveMaintenanceAccess('maintenance:delete');
  if (!resolved.success) return resolved;

  const context = await getRecordContext(resolved.data.companyId, maintenanceRecordId);
  if (!context) return {success: false, error: 'Manutenção não encontrada.'};

  try {
    const supabase = await getServerSupabaseClient();
    await softDeleteMaintenanceService(
      supabase,
      resolved.data.companyId,
      serviceId,
      resolved.data.profileId,
    );
    revalidateMaintenancePaths(maintenanceRecordId);
    return {success: true, data: undefined};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao excluir serviço.',
    };
  }
}
