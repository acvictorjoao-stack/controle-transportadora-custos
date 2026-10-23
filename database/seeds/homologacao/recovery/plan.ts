import type {ClassifiedRow, LinkCheckResult, PlanRow, RecoveryDecision} from './types';

export function decideRecoveryActions(
  classified: ClassifiedRow[],
  linkResults: LinkCheckResult[],
): {decisions: RecoveryDecision[]; abortReason: string | null} {
  const linkBlocked = new Map(
    linkResults.filter((r) => r.blocked).map((r) => [`${r.table}:${r.id}`, r] as const),
  );

  const decisions: RecoveryDecision[] = [];

  for (const row of classified) {
    if (row.state === 'INVALID') {
      return {
        decisions,
        abortReason: `INVALID ${row.plan.table}/${row.plan.key}: ${row.reason}`,
      };
    }

    if (row.state === 'SOFT_DELETED') {
      decisions.push({
        plan: row.plan,
        state: 'SOFT_DELETED',
        action: 'skipped',
        reason: row.reason,
      });
      continue;
    }

    // ACTIVE
    const block = linkBlocked.get(`${row.plan.table}:${row.plan.id}`);
    if (block) {
      return {
        decisions,
        abortReason: `link_blocked ${row.plan.table}/${row.plan.key}: ${block.reason} [${block.details.join('; ')}]`,
      };
    }

    decisions.push({
      plan: row.plan,
      state: 'ACTIVE',
      action: 'would_update',
      reason: 'eligible',
    });
  }

  return {decisions, abortReason: null};
}

export function activePlanRows(classified: ClassifiedRow[]): PlanRow[] {
  return classified.filter((row) => row.state === 'ACTIVE').map((row) => row.plan);
}

export function summarizeDecisions(decisions: RecoveryDecision[]): {
  wouldUpdate: number;
  skipped: number;
} {
  return {
    wouldUpdate: decisions.filter((d) => d.action === 'would_update').length,
    skipped: decisions.filter((d) => d.action === 'skipped').length,
  };
}
