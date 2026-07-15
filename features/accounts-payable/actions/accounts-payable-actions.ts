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
  cancelAccountsPayable,
  createAccountsPayable,
  deleteAccountsPayable,
  markAccountsPayablePaid,
  updateAccountsPayable,
} from '../queries';
import type {AccountsPayableEntry} from '../types';
import {
  createAccountsPayableSchema,
  markAccountsPayablePaidSchema,
  updateAccountsPayableSchema,
} from '../validation';

type FinancialPermission =
  | 'financeiro:create'
  | 'financeiro:update'
  | 'financeiro:delete';

function revalidateAccountsPayablePaths(entryId?: string) {
  revalidatePath(ROUTES.contasAPagar);
  revalidatePath(ROUTES.financeiro);
  if (entryId) {
    revalidatePath(ROUTES.contasAPagarDetail(entryId));
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

export async function createAccountsPayableAction(
  input: unknown,
): Promise<ActionResult<AccountsPayableEntry>> {
  const resolved = await resolveAccess('financeiro:create');
  if (!resolved.success) return resolved;

  const parsed = createAccountsPayableSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos do formulário.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const data = await createAccountsPayable(
      supabase,
      resolved.data.companyId,
      parsed.data,
      resolved.data.profileId,
    );
    revalidateAccountsPayablePaths(data.id);
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao criar conta a pagar.',
    };
  }
}

export async function updateAccountsPayableAction(
  entryId: string,
  input: unknown,
): Promise<ActionResult<AccountsPayableEntry>> {
  const resolved = await resolveAccess('financeiro:update');
  if (!resolved.success) return resolved;

  const parsed = updateAccountsPayableSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos do formulário.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const data = await updateAccountsPayable(
      supabase,
      resolved.data.companyId,
      entryId,
      parsed.data,
      resolved.data.profileId,
    );
    revalidateAccountsPayablePaths(entryId);
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao atualizar conta a pagar.',
    };
  }
}

export async function markAccountsPayablePaidAction(
  entryId: string,
  input: unknown,
): Promise<ActionResult<AccountsPayableEntry>> {
  const resolved = await resolveAccess('financeiro:update');
  if (!resolved.success) return resolved;

  const parsed = markAccountsPayablePaidSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos do pagamento.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const data = await markAccountsPayablePaid(
      supabase,
      resolved.data.companyId,
      entryId,
      resolved.data.profileId,
      parsed.data,
    );
    revalidateAccountsPayablePaths(entryId);
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao marcar conta como paga.',
    };
  }
}

export async function cancelAccountsPayableAction(
  entryId: string,
): Promise<ActionResult<AccountsPayableEntry>> {
  const resolved = await resolveAccess('financeiro:update');
  if (!resolved.success) return resolved;

  try {
    const supabase = await getServerSupabaseClient();
    const data = await cancelAccountsPayable(
      supabase,
      resolved.data.companyId,
      entryId,
      resolved.data.profileId,
    );
    revalidateAccountsPayablePaths(entryId);
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao cancelar conta a pagar.',
    };
  }
}

export async function deleteAccountsPayableAction(
  entryId: string,
): Promise<ActionResult<void>> {
  const resolved = await resolveAccess('financeiro:delete');
  if (!resolved.success) return resolved;

  try {
    const supabase = await getServerSupabaseClient();
    await deleteAccountsPayable(
      supabase,
      resolved.data.companyId,
      entryId,
      resolved.data.profileId,
    );
    revalidateAccountsPayablePaths(entryId);
    return {success: true, data: undefined};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao excluir conta a pagar.',
    };
  }
}
