import type {HmlSupabaseClient} from '../client';
import {classifyLiveRow, softPayloadFor} from './classify';
import type {ClassifiedRow, LiveRowSnapshot, PlanRow} from './types';

export async function fetchLiveSnapshot(
  supabase: HmlSupabaseClient,
  row: PlanRow,
): Promise<{live: LiveRowSnapshot | null; error: string | null}> {
  const {data, error} = await supabase.from(row.table).select('*').eq('id', row.id).maybeSingle();

  if (error) {
    return {live: null, error: error.message ?? 'fetch_failed'};
  }
  if (!data) {
    return {live: null, error: null};
  }

  const raw = data as Record<string, unknown>;
  return {
    live: {
      id: String(raw.id),
      company_id: String(raw.company_id),
      deleted_at: (raw.deleted_at as string | null) ?? null,
      is_headquarters: (raw.is_headquarters as boolean | null | undefined) ?? null,
      is_system: (raw.is_system as boolean | null | undefined) ?? null,
      status: (raw.status as string | null | undefined) ?? null,
      active: (raw.active as boolean | null | undefined) ?? null,
      contract_status: (raw.contract_status as string | null | undefined) ?? null,
    },
    error: null,
  };
}

export async function classifyPlanAgainstLive(
  supabase: HmlSupabaseClient,
  companyId: string,
  plan: PlanRow[],
): Promise<ClassifiedRow[]> {
  const classified: ClassifiedRow[] = [];
  for (const row of plan) {
    const {live, error} = await fetchLiveSnapshot(supabase, row);
    classified.push(classifyLiveRow(row, companyId, live, error));
  }
  return classified;
}

/**
 * Soft-delete de uma linha ACTIVE. Retorna erro se afetar ≠ 1 linha ou pós-condição falhar.
 */
export async function softDeleteActiveRow(
  supabase: HmlSupabaseClient,
  companyId: string,
  profileId: string,
  row: PlanRow,
  deletedAt: string,
): Promise<{ok: true} | {ok: false; reason: string}> {
  const before = await fetchLiveSnapshot(supabase, row);
  if (before.error) return {ok: false, reason: `pre_fetch:${before.error}`};
  const classified = classifyLiveRow(row, companyId, before.live, null);
  if (classified.state !== 'ACTIVE') {
    return {ok: false, reason: `not_active:${classified.state}:${classified.reason}`};
  }

  const payload = softPayloadFor(row.table, profileId, deletedAt);
  const {data, error} = await supabase
    .from(row.table)
    .update(payload as never)
    .eq('id', row.id)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .select('id');

  if (error) {
    return {ok: false, reason: `update_failed:${error.message ?? 'error'}`};
  }
  if ((data?.length ?? 0) !== 1) {
    return {ok: false, reason: `affected_not_1:${data?.length ?? 0}`};
  }

  const after = await fetchLiveSnapshot(supabase, row);
  if (after.error) return {ok: false, reason: `post_fetch:${after.error}`};
  const post = classifyLiveRow(row, companyId, after.live, null);
  if (post.state !== 'SOFT_DELETED') {
    return {ok: false, reason: `postcondition:${post.state}:${post.reason}`};
  }
  return {ok: true};
}
