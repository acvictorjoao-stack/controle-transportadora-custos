'use server';

import {revalidatePath} from 'next/cache';
import {z} from 'zod';

import {ROUTES} from '@/constants/routes/paths';
import type {ActionResult} from '@/features/organization/shared/action-result';
import {
  assertCompanyPermission,
  getCurrentCompanyId,
  getCurrentUserId,
  getServerSupabaseClient,
  requireCompanyMembership,
  COMPANY_ACCESS_DENIED,
} from '@/lib/auth/company';
import {zodFieldErrors} from '@/lib/validators/zod-field-errors';

import {
  updateCompanyExecutiveGoals,
  updateProfileCockpitPreferences,
} from '../queries';
import type {
  ExecutiveCockpitPreferences,
  ExecutiveGoals,
} from '../types';
import {
  ALL_COCKPIT_CHARTS,
  ALL_COCKPIT_WIDGETS,
  EXECUTIVE_GOAL_METRICS,
} from '../types';
import {mapCockpitPreferences} from '../services/preferences-mapper';
import {parseGoalsInput} from '../services/goals-mapper';

const goalValueSchema = z.union([z.number(), z.null(), z.string()]).optional();

const goalsSchema = z.record(z.string(), goalValueSchema);

const preferencesSchema = z.object({
  widgetOrder: z.array(z.string()),
  hiddenWidgets: z.array(z.string()),
  favoriteCharts: z.array(z.string()),
});

function revalidateCockpit() {
  revalidatePath(ROUTES.dashboardExecutivo);
}

export async function updateExecutiveGoalsAction(
  input: unknown,
): Promise<ActionResult<ExecutiveGoals>> {
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    return {success: false, error: 'Empresa não encontrada.'};
  }

  try {
    await requireCompanyMembership(supabase, companyId);
  } catch {
    return {success: false, error: COMPANY_ACCESS_DENIED};
  }

  const canWrite = await assertCompanyPermission(
    supabase,
    companyId,
    'dashboard:read',
  );
  if (!canWrite) {
    return {success: false, error: COMPANY_ACCESS_DENIED};
  }

  const parsed = goalsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os valores das metas.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  const allowed: Record<string, unknown> = {};
  for (const metric of EXECUTIVE_GOAL_METRICS) {
    if (metric in parsed.data) {
      allowed[metric] = parsed.data[metric];
    }
  }

  try {
    const goals = parseGoalsInput(allowed);
    const data = await updateCompanyExecutiveGoals(supabase, companyId, goals);
    revalidateCockpit();
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao salvar metas.',
    };
  }
}

export async function updateCockpitPreferencesAction(
  input: unknown,
): Promise<ActionResult<ExecutiveCockpitPreferences>> {
  const supabase = await getServerSupabaseClient();
  const userId = await getCurrentUserId(supabase);
  const companyId = await getCurrentCompanyId(supabase);

  if (!userId || !companyId) {
    return {success: false, error: 'Sessão inválida.'};
  }

  try {
    await requireCompanyMembership(supabase, companyId);
  } catch {
    return {success: false, error: COMPANY_ACCESS_DENIED};
  }

  const parsed = preferencesSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Preferências inválidas.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  const widgetOrder = parsed.data.widgetOrder.filter((id) =>
    ALL_COCKPIT_WIDGETS.includes(id as (typeof ALL_COCKPIT_WIDGETS)[number]),
  );
  const hiddenWidgets = parsed.data.hiddenWidgets.filter((id) =>
    ALL_COCKPIT_WIDGETS.includes(id as (typeof ALL_COCKPIT_WIDGETS)[number]),
  );
  const favoriteCharts = parsed.data.favoriteCharts.filter((id) =>
    ALL_COCKPIT_CHARTS.includes(id as (typeof ALL_COCKPIT_CHARTS)[number]),
  );

  if (widgetOrder.length === 0) {
    return {success: false, error: 'Ordem de widgets inválida.'};
  }

  try {
    const preferences = mapCockpitPreferences({
      executive_cockpit: {
        widgetOrder,
        hiddenWidgets,
        favoriteCharts,
      },
    });
    const data = await updateProfileCockpitPreferences(
      supabase,
      userId,
      preferences,
    );
    revalidateCockpit();
    return {success: true, data};
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Erro ao salvar preferências.',
    };
  }
}
