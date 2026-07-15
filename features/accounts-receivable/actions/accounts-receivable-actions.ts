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
  cancelAccountsReceivable,
  createAccountsReceivable,
  deleteAccountsReceivable,
  markAccountsReceivableReceived,
  updateAccountsReceivable,
} from '../queries';
import type {AccountsReceivableEntry} from '../types';
import {
  createAccountsReceivableSchema,
  markAccountsReceivableReceivedSchema,
  updateAccountsReceivableSchema,
} from '../validation';

type FinancialPermission =
  | 'financeiro:create'
  | 'financeiro:update'
  | 'financeiro:delete';

function revalidateAccountsReceivablePaths(entryId?: string) {
  revalidatePath(ROUTES.contasAReceber);
  revalidatePath(ROUTES.financeiro);
  if (entryId) {
    revalidatePath(ROUTES.contasAReceberDetail(entryId));
  }
}

async function resolveAccess(
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

export async function createAccountsReceivableAction(
  input: unknown,
): Promise<ActionResult<AccountsReceivableEntry>> {
  const resolved = await resolveAccess('financeiro:create');
  if (!resolved.success) return resolved;

  const parsed = createAccountsReceivableSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos do formulário.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const data = await createAccountsReceivable(
      supabase,
      resolved.data.companyId,
      parsed.data,
      resolved.data.profileId,
    );
    revalidateAccountsReceivablePaths(data.id);
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao criar conta a receber.',
    };
  }
}

export async function updateAccountsReceivableAction(
  entryId: string,
  input: unknown,
): Promise<ActionResult<AccountsReceivableEntry>> {
  const resolved = await resolveAccess('financeiro:update');
  if (!resolved.success) return resolved;

  const parsed = updateAccountsReceivableSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos do formulário.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const data = await updateAccountsReceivable(
      supabase,
      resolved.data.companyId,
      entryId,
      parsed.data,
      resolved.data.profileId,
    );
    revalidateAccountsReceivablePaths(entryId);
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao atualizar conta a receber.',
    };
  }
}

export async function markAccountsReceivableReceivedAction(
  entryId: string,
  input: unknown,
): Promise<ActionResult<AccountsReceivableEntry>> {
  const resolved = await resolveAccess('financeiro:update');
  if (!resolved.success) return resolved;

  const parsed = markAccountsReceivableReceivedSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos do recebimento.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const data = await markAccountsReceivableReceived(
      supabase,
      resolved.data.companyId,
      entryId,
      resolved.data.profileId,
      parsed.data,
    );
    revalidateAccountsReceivablePaths(entryId);
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao marcar conta como recebida.',
    };
  }
}

export async function cancelAccountsReceivableAction(
  entryId: string,
): Promise<ActionResult<AccountsReceivableEntry>> {
  const resolved = await resolveAccess('financeiro:update');
  if (!resolved.success) return resolved;

  try {
    const supabase = await getServerSupabaseClient();
    const data = await cancelAccountsReceivable(
      supabase,
      resolved.data.companyId,
      entryId,
      resolved.data.profileId,
    );
    revalidateAccountsReceivablePaths(entryId);
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao cancelar conta a receber.',
    };
  }
}

export async function deleteAccountsReceivableAction(
  entryId: string,
): Promise<ActionResult<void>> {
  const resolved = await resolveAccess('financeiro:delete');
  if (!resolved.success) return resolved;

  try {
    const supabase = await getServerSupabaseClient();
    await deleteAccountsReceivable(
      supabase,
      resolved.data.companyId,
      entryId,
      resolved.data.profileId,
    );
    revalidateAccountsReceivablePaths(entryId);
    return {success: true, data: undefined};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao excluir conta a receber.',
    };
  }
}
