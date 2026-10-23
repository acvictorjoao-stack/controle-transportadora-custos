import {
  HML_HARD_DELETE_COMPANY_ID,
  HML_HARD_DELETE_EXPECTED_ENTRY_COUNT,
  type HmlHardDeleteTable,
} from './constants';
import {
  HML_HARD_DELETE_EXPECTED_ENTRIES,
  type ExpectedManifestEntry,
} from './expected-ids';
import type {LiveTargetRow, TargetValidationResult} from './types';

export function validateLiveTargetRow(
  expected: ExpectedManifestEntry,
  live: LiveTargetRow | null,
  companyId: string = HML_HARD_DELETE_COMPANY_ID,
): {ok: true; present: boolean} | {ok: false; reason: string} {
  if (!live) {
    return {ok: true, present: false};
  }
  if (live.id !== expected.id) {
    return {ok: false, reason: 'id_mismatch'};
  }
  if (live.company_id !== companyId) {
    return {ok: false, reason: 'company_id_mismatch'};
  }
  if (expected.table === 'branches') {
    if (live.is_headquarters === true) {
      return {ok: false, reason: 'refuses_headquarters'};
    }
    if (expected.expectedCode && live.code !== expected.expectedCode) {
      return {ok: false, reason: 'branch_code_mismatch'};
    }
    if (live.code === 'HQ') {
      return {ok: false, reason: 'refuses_hq_code'};
    }
  }
  if (expected.table === 'cost_centers' || expected.table === 'positions') {
    if (live.is_system === true) {
      return {ok: false, reason: 'refuses_system_row'};
    }
    if (expected.expectedCode && live.code !== expected.expectedCode) {
      return {ok: false, reason: 'code_mismatch'};
    }
  }
  return {ok: true, present: true};
}

/**
 * Tudo-ou-nada de presença: todos os 43 presentes → elegível;
 * todos ausentes → already_clean; mistura → abort (estado parcial).
 */
export function classifyTargetPresence(
  results: Array<{expected: ExpectedManifestEntry; live: LiveTargetRow | null}>,
  companyId: string = HML_HARD_DELETE_COMPANY_ID,
): TargetValidationResult {
  if (results.length !== HML_HARD_DELETE_EXPECTED_ENTRY_COUNT) {
    return {
      ok: false,
      reason: `result_count_${results.length}_!=_${HML_HARD_DELETE_EXPECTED_ENTRY_COUNT}`,
    };
  }

  let presentCount = 0;
  let absentCount = 0;

  for (const item of results) {
    const validated = validateLiveTargetRow(item.expected, item.live, companyId);
    if (!validated.ok) {
      return {ok: false, reason: `${item.expected.table}:${validated.reason}`};
    }
    if (validated.present) presentCount += 1;
    else absentCount += 1;
  }

  if (presentCount > 0 && absentCount > 0) {
    return {
      ok: false,
      reason: `partial_state present=${presentCount} absent=${absentCount}`,
    };
  }

  return {ok: true, presentCount, absentCount};
}

export function buildExpectedLookup(): Map<
  string,
  ExpectedManifestEntry
> {
  return new Map(
    HML_HARD_DELETE_EXPECTED_ENTRIES.map((entry) => [
      `${entry.table}:${entry.id}`,
      entry,
    ]),
  );
}

export function assertNoExtraLiveRows(
  table: HmlHardDeleteTable,
  liveIds: string[],
  allowed: Set<string>,
): {ok: true} | {ok: false; reason: string} {
  for (const id of liveIds) {
    if (!allowed.has(id)) {
      return {ok: false, reason: `extra_live_row:${table}`};
    }
  }
  return {ok: true};
}
