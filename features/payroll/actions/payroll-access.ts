import {revalidatePath} from 'next/cache';

import {ROUTES} from '@/constants/routes/paths';
import type {ActionResult} from '@/features/organization/shared/action-result';
import {
  assertCompanyPermission,
  COMPANY_ACCESS_DENIED,
  getCompanyAccessContext,
  getCurrentCompanyId,
  getServerSupabaseClient,
} from '@/lib/auth/company';
import {isPortalOwner} from '@/lib/auth/portal';

export type PayrollPermission =
  | 'financeiro:read'
  | 'financeiro:create'
  | 'financeiro:update'
  | 'financeiro:delete';

/**
 * Resolve empresa e permissão exclusivamente pela sessão autenticada.
 * Nunca aceita company_id enviado pelo client.
 */
export async function resolvePayrollAccess(
  permission: PayrollPermission,
): Promise<ActionResult<{companyId: string; profileId: string}>> {
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    return {success: false, error: 'Empresa não encontrada.'};
  }

  const access = await getCompanyAccessContext(supabase, companyId);
  if (
    !access ||
    access.companyId !== companyId ||
    ((await isPortalOwner(supabase)) && !access.isMasterActing)
  ) {
    return {success: false, error: COMPANY_ACCESS_DENIED};
  }

  const allowed = await assertCompanyPermission(supabase, companyId, permission);
  if (!allowed) {
    return {success: false, error: COMPANY_ACCESS_DENIED};
  }

  return {success: true, data: {companyId, profileId: access.profileId}};
}

export function revalidatePayrollPaths() {
  revalidatePath(ROUTES.despesasDePessoal);
  revalidatePath(ROUTES.contasAPagar);
  revalidatePath(ROUTES.fluxoDeCaixa);
  revalidatePath(ROUTES.financeiro);
  revalidatePath(ROUTES.dashboard);
}

export function revalidateEmployeePaths() {
  revalidatePath(ROUTES.administracaoFuncionarios);
  revalidatePayrollPaths();
}

export function revalidatePositionPaths() {
  revalidatePath(ROUTES.administracaoCargos);
  revalidatePayrollPaths();
}
