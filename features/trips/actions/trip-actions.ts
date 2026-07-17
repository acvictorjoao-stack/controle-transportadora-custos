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
  cancelTrip,
  completeTrip,
  createTrip,
  createTripDocument,
  createTripExpense,
  createTripOccurrence,
  createTripStop,
  getTripById,
  softDeleteTrip,
  softDeleteTripDocument,
  softDeleteTripExpense,
  startTrip,
  updateTrip,
  updateTripExpense,
  updateTripStatus,
  upsertTripChecklist,
} from '../queries';
import type {
  Trip,
  TripChecklist,
  TripDocument,
  TripExpense,
  TripOccurrence,
  TripStop,
} from '../types';
import {
  cancelTripSchema,
  completeTripSchema,
  createTripExpenseSchema,
  createTripOccurrenceSchema,
  createTripSchema,
  createTripStopSchema,
  deleteTripExpenseSchema,
  updateTripExpenseSchema,
  updateTripSchema,
  updateTripStatusSchema,
  uploadTripFileSchema,
  upsertTripChecklistSchema,
} from '../validation';

type TripPermission =
  | 'trips:read'
  | 'trips:create'
  | 'trips:update'
  | 'trips:delete';

function revalidateTripPaths(tripId?: string) {
  revalidatePath(ROUTES.viagens);
  revalidatePath(ROUTES.dashboard);
  revalidatePath(ROUTES.clientes);
  revalidatePath(ROUTES.financeiro);
  if (tripId) {
    revalidatePath(ROUTES.viagemDetail(tripId));
  }
}

async function resolveTripAccess(
  permission: TripPermission,
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

export async function createTripAction(
  input: unknown,
): Promise<ActionResult<Trip>> {
  const resolved = await resolveTripAccess('trips:create');
  if (!resolved.success) return resolved;

  const parsed = createTripSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos do formulário.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const trip = await createTrip(
      supabase,
      resolved.data.companyId,
      parsed.data,
      resolved.data.profileId,
    );
    revalidateTripPaths(trip.id);
    return {success: true, data: trip};
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao criar viagem.',
    };
  }
}

export async function updateTripAction(
  tripId: string,
  input: unknown,
): Promise<ActionResult<Trip>> {
  const resolved = await resolveTripAccess('trips:update');
  if (!resolved.success) return resolved;

  const parsed = updateTripSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos do formulário.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const trip = await updateTrip(
      supabase,
      resolved.data.companyId,
      tripId,
      parsed.data,
      resolved.data.profileId,
    );
    revalidateTripPaths(trip.id);
    return {success: true, data: trip};
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao atualizar viagem.',
    };
  }
}

export async function deleteTripAction(tripId: string): Promise<ActionResult<void>> {
  const resolved = await resolveTripAccess('trips:delete');
  if (!resolved.success) return resolved;

  try {
    const supabase = await getServerSupabaseClient();
    await softDeleteTrip(
      supabase,
      resolved.data.companyId,
      tripId,
      resolved.data.profileId,
    );
    revalidateTripPaths(tripId);
    return {success: true, data: undefined};
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao excluir viagem.',
    };
  }
}

export async function updateTripStatusAction(
  tripId: string,
  input: unknown,
): Promise<ActionResult<Trip>> {
  const resolved = await resolveTripAccess('trips:update');
  if (!resolved.success) return resolved;

  const parsed = updateTripStatusSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Status inválido.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const trip = await updateTripStatus(
      supabase,
      resolved.data.companyId,
      tripId,
      parsed.data.tripStatus,
      resolved.data.profileId,
    );
    revalidateTripPaths(trip.id);
    return {success: true, data: trip};
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao atualizar status.',
    };
  }
}

export async function startTripAction(tripId: string): Promise<ActionResult<Trip>> {
  const resolved = await resolveTripAccess('trips:update');
  if (!resolved.success) return resolved;

  try {
    const supabase = await getServerSupabaseClient();
    const trip = await startTrip(
      supabase,
      resolved.data.companyId,
      tripId,
      resolved.data.profileId,
    );
    revalidateTripPaths(trip.id);
    return {success: true, data: trip};
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao iniciar viagem.',
    };
  }
}

export async function completeTripAction(
  tripId: string,
  input: unknown,
): Promise<ActionResult<Trip>> {
  const resolved = await resolveTripAccess('trips:update');
  if (!resolved.success) return resolved;

  const parsed = completeTripSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Informe um KM final válido.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const trip = await completeTrip(
      supabase,
      resolved.data.companyId,
      tripId,
      parsed.data,
      resolved.data.profileId,
    );
    revalidateTripPaths(trip.id);
    return {success: true, data: trip};
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao concluir viagem.',
    };
  }
}

export async function cancelTripAction(
  tripId: string,
  input: unknown,
): Promise<ActionResult<Trip>> {
  const resolved = await resolveTripAccess('trips:update');
  if (!resolved.success) return resolved;

  const parsed = cancelTripSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Informe a observação do cancelamento.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const trip = await cancelTrip(
      supabase,
      resolved.data.companyId,
      tripId,
      parsed.data,
      resolved.data.profileId,
    );
    revalidateTripPaths(trip.id);
    return {success: true, data: trip};
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao cancelar viagem.',
    };
  }
}

export async function registerTripFileAction(
  input: unknown,
): Promise<ActionResult<TripDocument>> {
  const resolved = await resolveTripAccess('trips:update');
  if (!resolved.success) return resolved;

  const parsed = uploadTripFileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Dados do arquivo inválidos.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const trip = await getTripById(
      supabase,
      resolved.data.companyId,
      parsed.data.tripId,
    );
    if (!trip) {
      return {success: false, error: 'Viagem não encontrada.'};
    }

    const document = await createTripDocument(
      supabase,
      resolved.data.companyId,
      parsed.data.tripId,
      {
        name: parsed.data.name,
        fileUrl: parsed.data.fileUrl,
        storagePath: parsed.data.storagePath,
        documentType: parsed.data.documentType,
        mimeType: parsed.data.mimeType,
        fileSize: parsed.data.fileSize,
        branchId: trip.branchId,
      },
      resolved.data.profileId,
    );
    revalidateTripPaths(parsed.data.tripId);
    return {success: true, data: document};
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao registrar arquivo.',
    };
  }
}

export async function deleteTripDocumentAction(
  documentId: string,
  tripId: string,
): Promise<ActionResult<void>> {
  const resolved = await resolveTripAccess('trips:delete');
  if (!resolved.success) return resolved;

  try {
    const supabase = await getServerSupabaseClient();
    await softDeleteTripDocument(supabase, resolved.data.companyId, documentId);
    revalidateTripPaths(tripId);
    return {success: true, data: undefined};
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao excluir documento.',
    };
  }
}

export async function upsertTripChecklistAction(
  input: unknown,
): Promise<ActionResult<TripChecklist>> {
  const resolved = await resolveTripAccess('trips:update');
  if (!resolved.success) return resolved;

  const parsed = upsertTripChecklistSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos do checklist.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const trip = await getTripById(
      supabase,
      resolved.data.companyId,
      parsed.data.tripId,
    );
    if (!trip) {
      return {success: false, error: 'Viagem não encontrada.'};
    }

    const checklist = await upsertTripChecklist(
      supabase,
      resolved.data.companyId,
      parsed.data,
      resolved.data.profileId,
      trip.branchId,
    );
    revalidateTripPaths(parsed.data.tripId);
    return {success: true, data: checklist};
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao salvar checklist.',
    };
  }
}

export async function createTripOccurrenceAction(
  input: unknown,
): Promise<ActionResult<TripOccurrence>> {
  const resolved = await resolveTripAccess('trips:update');
  if (!resolved.success) return resolved;

  const parsed = createTripOccurrenceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos da ocorrência.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const trip = await getTripById(
      supabase,
      resolved.data.companyId,
      parsed.data.tripId,
    );
    if (!trip) {
      return {success: false, error: 'Viagem não encontrada.'};
    }

    const occurrence = await createTripOccurrence(
      supabase,
      resolved.data.companyId,
      parsed.data,
      resolved.data.profileId,
      trip.branchId,
    );
    revalidateTripPaths(parsed.data.tripId);
    return {success: true, data: occurrence};
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao registrar ocorrência.',
    };
  }
}

export async function createTripExpenseAction(
  input: unknown,
): Promise<ActionResult<TripExpense>> {
  const resolved = await resolveTripAccess('trips:update');
  if (!resolved.success) return resolved;

  const parsed = createTripExpenseSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos da despesa.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const trip = await getTripById(
      supabase,
      resolved.data.companyId,
      parsed.data.tripId,
    );
    if (!trip) {
      return {success: false, error: 'Viagem não encontrada.'};
    }

    const expense = await createTripExpense(
      supabase,
      resolved.data.companyId,
      parsed.data,
      resolved.data.profileId,
      trip.branchId,
    );
    revalidateTripPaths(parsed.data.tripId);
    return {success: true, data: expense};
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao registrar despesa.',
    };
  }
}

export async function updateTripExpenseAction(
  input: unknown,
): Promise<ActionResult<TripExpense>> {
  const resolved = await resolveTripAccess('trips:update');
  if (!resolved.success) return resolved;

  const parsed = updateTripExpenseSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos da despesa.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const trip = await getTripById(
      supabase,
      resolved.data.companyId,
      parsed.data.tripId,
    );
    if (!trip) {
      return {success: false, error: 'Viagem não encontrada.'};
    }

    const expense = await updateTripExpense(
      supabase,
      resolved.data.companyId,
      parsed.data,
      resolved.data.profileId,
    );
    revalidateTripPaths(parsed.data.tripId);
    return {success: true, data: expense};
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao atualizar despesa.',
    };
  }
}

export async function deleteTripExpenseAction(
  input: unknown,
): Promise<ActionResult<void>> {
  const resolved = await resolveTripAccess('trips:delete');
  if (!resolved.success) return resolved;

  const parsed = deleteTripExpenseSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Despesa inválida.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    await softDeleteTripExpense(
      supabase,
      resolved.data.companyId,
      parsed.data.id,
      resolved.data.profileId,
    );
    revalidateTripPaths(parsed.data.tripId);
    return {success: true, data: undefined};
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao excluir despesa.',
    };
  }
}

export async function createTripStopAction(
  input: unknown,
): Promise<ActionResult<TripStop>> {
  const resolved = await resolveTripAccess('trips:update');
  if (!resolved.success) return resolved;

  const parsed = createTripStopSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos da parada.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const trip = await getTripById(
      supabase,
      resolved.data.companyId,
      parsed.data.tripId,
    );
    if (!trip) {
      return {success: false, error: 'Viagem não encontrada.'};
    }

    const stop = await createTripStop(
      supabase,
      resolved.data.companyId,
      parsed.data,
      resolved.data.profileId,
      trip.branchId,
    );
    revalidateTripPaths(parsed.data.tripId);
    return {success: true, data: stop};
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao registrar parada.',
    };
  }
}
