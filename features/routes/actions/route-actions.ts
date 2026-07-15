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
  createRoute,
  softDeleteRoute,
  updateRoute,
  updateRouteOperationalStatus,
} from '../queries';
import type {Route} from '../types';
import {
  createRouteSchema,
  updateRouteSchema,
  updateRouteStatusSchema,
} from '../validation';

type RoutePermission =
  | 'routes:read'
  | 'routes:create'
  | 'routes:update'
  | 'routes:delete';

function revalidateRoutePaths(routeId?: string) {
  revalidatePath(ROUTES.rotas);
  revalidatePath(ROUTES.dashboard);
  if (routeId) {
    revalidatePath(ROUTES.rotaDetail(routeId));
  }
}

async function resolveRouteAccess(
  permission: RoutePermission,
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

export async function createRouteAction(
  input: unknown,
): Promise<ActionResult<Route>> {
  const resolved = await resolveRouteAccess('routes:create');
  if (!resolved.success) return resolved;

  const parsed = createRouteSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos do formulário.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const data = await createRoute(
      supabase,
      resolved.data.companyId,
      parsed.data,
      resolved.data.profileId,
    );
    revalidateRoutePaths();
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao criar rota.',
    };
  }
}

export async function updateRouteAction(
  routeId: string,
  input: unknown,
): Promise<ActionResult<Route>> {
  const resolved = await resolveRouteAccess('routes:update');
  if (!resolved.success) return resolved;

  const parsed = updateRouteSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos do formulário.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const data = await updateRoute(
      supabase,
      resolved.data.companyId,
      routeId,
      parsed.data,
      resolved.data.profileId,
    );
    revalidateRoutePaths(routeId);
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao atualizar rota.',
    };
  }
}

export async function deleteRouteAction(
  routeId: string,
): Promise<ActionResult<void>> {
  const resolved = await resolveRouteAccess('routes:delete');
  if (!resolved.success) return resolved;

  try {
    const supabase = await getServerSupabaseClient();
    await softDeleteRoute(
      supabase,
      resolved.data.companyId,
      routeId,
      resolved.data.profileId,
    );
    revalidateRoutePaths(routeId);
    return {success: true, data: undefined};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao excluir rota.',
    };
  }
}

export async function updateRouteStatusAction(
  routeId: string,
  input: unknown,
): Promise<ActionResult<Route>> {
  const resolved = await resolveRouteAccess('routes:update');
  if (!resolved.success) return resolved;

  const parsed = updateRouteStatusSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Status inválido.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  try {
    const supabase = await getServerSupabaseClient();
    const data = await updateRouteOperationalStatus(
      supabase,
      resolved.data.companyId,
      routeId,
      parsed.data.operationalStatus,
      resolved.data.profileId,
    );
    revalidateRoutePaths(routeId);
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao alterar status.',
    };
  }
}
