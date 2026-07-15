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
  createFinancialDocument,
  createFinancialEntry,
  getFinancialEntryById,
  cancelFinancialEntry,
  markFinancialEntryPaid,
  reverseFinancialEntry,
  softDeleteFinancialDocument,
  softDeleteFinancialEntry,
  updateFinancialEntry,
} from '../queries';
import type {FinancialDocument, FinancialEntry} from '../types';
import {
  createFinancialEntrySchema,
  markFinancialEntryPaidSchema,
  reverseFinancialEntrySchema,
  updateFinancialEntrySchema,
  uploadFinancialFileSchema,
} from '../validation';

type FinancialPermission =
  | 'financeiro:read'
  | 'financeiro:create'
  | 'financeiro:update'
  | 'financeiro:delete';

function revalidateFinancialPaths(entryId?: string) {
  revalidatePath(ROUTES.financeiro);
  revalidatePath(ROUTES.contasAPagar);
  revalidatePath(ROUTES.dashboard);
  if (entryId) {
    revalidatePath(ROUTES.financeiroDetail(entryId));
    revalidatePath(ROUTES.contasAPagarDetail(entryId));
  }
}

async function resolveFinancialAccess(
  permission: FinancialPermission,
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

export async function createFinancialEntryAction(
  input: unknown,
): Promise<ActionResult<FinancialEntry>> {
  const resolved = await resolveFinancialAccess('financeiro:create');
  if (!resolved.success) return resolved;

  const parsed = createFinancialEntrySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos do formulário.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const data = await createFinancialEntry(
      supabase,
      resolved.data.companyId,
      parsed.data,
      resolved.data.profileId,
      {source_module: 'manual'},
    );
    revalidateFinancialPaths();
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao criar lançamento.',
    };
  }
}

export async function updateFinancialEntryAction(
  entryId: string,
  input: unknown,
): Promise<ActionResult<FinancialEntry>> {
  const resolved = await resolveFinancialAccess('financeiro:update');
  if (!resolved.success) return resolved;

  const parsed = updateFinancialEntrySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos do formulário.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const data = await updateFinancialEntry(
      supabase,
      resolved.data.companyId,
      entryId,
      parsed.data,
      resolved.data.profileId,
    );
    revalidateFinancialPaths(entryId);
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao atualizar lançamento.',
    };
  }
}

export async function markFinancialEntryPaidAction(
  entryId: string,
  input?: unknown,
): Promise<ActionResult<FinancialEntry>> {
  const resolved = await resolveFinancialAccess('financeiro:update');
  if (!resolved.success) return resolved;

  const parsed = markFinancialEntryPaidSchema.safeParse(input ?? {});
  if (!parsed.success) {
    return {success: false, error: 'Dados inválidos.'};
  }

  try {
    const supabase = await getServerSupabaseClient();
    const data = await markFinancialEntryPaid(
      supabase,
      resolved.data.companyId,
      entryId,
      resolved.data.profileId,
      {
        paidAt: parsed.data.paidAt,
        paidAmount: parsed.data.paidAmount,
      },
    );
    revalidateFinancialPaths(entryId);
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao registrar pagamento.',
    };
  }
}

export async function cancelFinancialEntryAction(
  entryId: string,
): Promise<ActionResult<FinancialEntry>> {
  const resolved = await resolveFinancialAccess('financeiro:update');
  if (!resolved.success) return resolved;

  try {
    const supabase = await getServerSupabaseClient();
    const data = await cancelFinancialEntry(
      supabase,
      resolved.data.companyId,
      entryId,
      resolved.data.profileId,
    );
    revalidateFinancialPaths(entryId);
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao cancelar lançamento.',
    };
  }
}

export async function reverseFinancialEntryAction(
  entryId: string,
  input?: unknown,
): Promise<ActionResult<FinancialEntry>> {
  const resolved = await resolveFinancialAccess('financeiro:delete');
  if (!resolved.success) return resolved;

  const parsed = reverseFinancialEntrySchema.safeParse(input ?? {});
  if (!parsed.success) {
    return {success: false, error: 'Dados inválidos.'};
  }

  try {
    const supabase = await getServerSupabaseClient();
    const data = await reverseFinancialEntry(
      supabase,
      resolved.data.companyId,
      entryId,
      resolved.data.profileId,
      parsed.data.reason,
    );
    revalidateFinancialPaths(entryId);
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao estornar lançamento.',
    };
  }
}

export async function deleteFinancialEntryAction(
  entryId: string,
): Promise<ActionResult<void>> {
  const resolved = await resolveFinancialAccess('financeiro:delete');
  if (!resolved.success) return resolved;

  try {
    const supabase = await getServerSupabaseClient();
    await softDeleteFinancialEntry(
      supabase,
      resolved.data.companyId,
      entryId,
      resolved.data.profileId,
    );
    revalidateFinancialPaths(entryId);
    return {success: true, data: undefined};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao excluir lançamento.',
    };
  }
}

export async function uploadFinancialFileAction(
  input: unknown,
): Promise<ActionResult<FinancialDocument>> {
  const resolved = await resolveFinancialAccess('financeiro:update');
  if (!resolved.success) return resolved;

  const parsed = uploadFinancialFileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos do upload.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const entry = await getFinancialEntryById(
      supabase,
      resolved.data.companyId,
      parsed.data.financialEntryId,
    );
    if (!entry) {
      return {success: false, error: 'Lançamento não encontrado.'};
    }

    const data = await createFinancialDocument(
      supabase,
      resolved.data.companyId,
      parsed.data.financialEntryId,
      {
        name: parsed.data.name,
        fileUrl: parsed.data.fileUrl,
        storagePath: parsed.data.storagePath,
        documentType: parsed.data.documentType,
        mimeType: parsed.data.mimeType,
        fileSize: parsed.data.fileSize,
        branchId: entry.branchId,
        vehicleId: entry.vehicleId,
        driverId: entry.driverId,
        tripId: entry.tripId,
        fuelRecordId: entry.fuelRecordId,
        maintenanceRecordId: entry.maintenanceRecordId,
        tireId: entry.tireId,
      },
      resolved.data.profileId,
    );
    revalidateFinancialPaths(parsed.data.financialEntryId);
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao enviar documento.',
    };
  }
}

export async function deleteFinancialDocumentAction(
  documentId: string,
  entryId: string,
): Promise<ActionResult<void>> {
  const resolved = await resolveFinancialAccess('financeiro:delete');
  if (!resolved.success) return resolved;

  try {
    const supabase = await getServerSupabaseClient();
    await softDeleteFinancialDocument(
      supabase,
      resolved.data.companyId,
      documentId,
      resolved.data.profileId,
    );
    revalidateFinancialPaths(entryId);
    return {success: true, data: undefined};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao excluir documento.',
    };
  }
}
