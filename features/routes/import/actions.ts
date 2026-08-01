'use server';

import {revalidatePath} from 'next/cache';

import {ROUTES} from '@/constants/routes/paths';
import type {ActionResult} from '@/features/organization/shared/action-result';
import {normalizeLookupKey, type ImportCommitSummary} from '@/features/import';
import {
  assertCompanyPermission,
  COMPANY_ACCESS_DENIED,
  getCurrentCompanyId,
  getServerSupabaseClient,
  getUserCompanyMembership,
} from '@/lib/auth/company';

import {createRoute, updateRoute} from '../queries';
import {countExistingMatches} from './preview';
import {
  buildRouteImportTemplateWorkbook,
  parseRouteImportFile,
  workbookToArrayBuffer,
} from './parser';
import type {
  RouteImportLookupMaps,
  RouteImportPayload,
  RouteImportPreviewResult,
} from './types';
import {validateRouteImportRows} from './validator';

async function resolveImportAccess(
  permission: 'routes:create' | 'routes:update' | 'routes:read',
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

async function loadLookupMaps(
  companyId: string,
): Promise<RouteImportLookupMaps> {
  const supabase = await getServerSupabaseClient();

  const [customersResult, branchesResult, routesResult] = await Promise.all([
    supabase
      .from('customers')
      .select('id, legal_name, trade_name')
      .eq('company_id', companyId)
      .is('deleted_at', null),
    supabase
      .from('branches')
      .select('id, name')
      .eq('company_id', companyId)
      .is('deleted_at', null),
    supabase
      .from('routes')
      .select('id, origin, destination, customer_id')
      .eq('company_id', companyId)
      .is('deleted_at', null),
  ]);

  if (customersResult.error) throw new Error(customersResult.error.message);
  if (branchesResult.error) throw new Error(branchesResult.error.message);
  if (routesResult.error) throw new Error(routesResult.error.message);

  type CustomerLookupRow = {
    id: string;
    legal_name: string;
    trade_name: string | null;
  };
  type BranchLookupRow = {id: string; name: string};
  type RouteLookupRow = {
    id: string;
    origin: string;
    destination: string;
    customer_id: string | null;
  };

  const customersByName = new Map<string, {id: string; name: string}>();
  for (const row of (customersResult.data ?? []) as CustomerLookupRow[]) {
    const displayName = row.trade_name?.trim() || row.legal_name;
    if (!displayName) continue;
    customersByName.set(normalizeLookupKey(displayName), {
      id: row.id,
      name: displayName,
    });
    if (row.legal_name?.trim()) {
      customersByName.set(normalizeLookupKey(row.legal_name), {
        id: row.id,
        name: displayName,
      });
    }
    if (row.trade_name?.trim()) {
      customersByName.set(normalizeLookupKey(row.trade_name), {
        id: row.id,
        name: displayName,
      });
    }
  }

  const branchesByName = new Map<string, {id: string; name: string}>();
  for (const row of (branchesResult.data ?? []) as BranchLookupRow[]) {
    if (!row.name?.trim()) continue;
    branchesByName.set(normalizeLookupKey(row.name), {
      id: row.id,
      name: row.name,
    });
  }

  return {
    customersByName,
    branchesByName,
    existingRoutes: ((routesResult.data ?? []) as RouteLookupRow[]).map((row) => ({
      id: row.id,
      origin: row.origin,
      destination: row.destination,
      customerId: row.customer_id,
    })),
  };
}

export async function downloadRouteImportTemplateAction(): Promise<
  ActionResult<{fileName: string; base64: string; mimeType: string}>
> {
  const resolved = await resolveImportAccess('routes:read');
  if (!resolved.success) return resolved;

  try {
    const workbook = buildRouteImportTemplateWorkbook();
    const buffer = workbookToArrayBuffer(workbook);
    const base64 = Buffer.from(buffer).toString('base64');
    return {
      success: true,
      data: {
        fileName: 'modelo-importacao-rotas.xlsx',
        base64,
        mimeType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Erro ao gerar modelo Excel.',
    };
  }
}

export async function previewRouteImportAction(
  formData: FormData,
): Promise<
  ActionResult<RouteImportPreviewResult & {existingMatches: number}>
> {
  const resolved = await resolveImportAccess('routes:create');
  if (!resolved.success) return resolved;

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return {success: false, error: 'Selecione um arquivo Excel.'};
  }

  try {
    const buffer = await file.arrayBuffer();
    const rawRows = parseRouteImportFile(buffer, file.name);
    const maps = await loadLookupMaps(resolved.data.companyId);
    const preview = validateRouteImportRows(rawRows, maps);
    return {
      success: true,
      data: {
        ...preview,
        existingMatches: countExistingMatches(preview),
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Erro ao validar planilha.',
    };
  }
}

export async function commitRouteImportAction(input: {
  rows: RouteImportPayload[];
  updateExisting: boolean;
}): Promise<ActionResult<ImportCommitSummary>> {
  const createAccess = await resolveImportAccess('routes:create');
  if (!createAccess.success) return createAccess;

  const updateAccess = input.updateExisting
    ? await resolveImportAccess('routes:update')
    : null;
  if (updateAccess && !updateAccess.success) return updateAccess;

  const supabase = await getServerSupabaseClient();
  const {companyId, profileId} = createAccess.data;

  const summary: ImportCommitSummary = {
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  for (const [index, row] of input.rows.entries()) {
    const rowNumber = index + 1;
    try {
      const payload = {
        name: row.name,
        code: null,
        origin: row.origin,
        destination: row.destination,
        routeType: 'delivery' as const,
        plannedDistanceKm: row.plannedDistanceKm,
        leadTimeDays: row.leadTimeDays,
        customerId: row.customerId,
        branchId: row.branchId,
        notes: null,
        operationalStatus: row.operationalStatus,
      };

      if (row.existingRouteId) {
        if (!input.updateExisting) {
          summary.skipped += 1;
          continue;
        }
        await updateRoute(supabase, companyId, row.existingRouteId, payload, profileId);
        summary.updated += 1;
        continue;
      }

      await createRoute(supabase, companyId, payload, profileId);
      summary.created += 1;
    } catch (error) {
      summary.failed += 1;
      summary.errors.push({
        rowNumber,
        message: error instanceof Error ? error.message : 'Falha ao importar linha.',
      });
    }
  }

  revalidatePath(ROUTES.rotas);
  revalidatePath(ROUTES.dashboard);
  revalidatePath(ROUTES.dashboardExecutivo);
  revalidatePath(ROUTES.dashboardInteligencia);
  revalidatePath(ROUTES.qualidadeCadastros);

  return {success: true, data: summary};
}
