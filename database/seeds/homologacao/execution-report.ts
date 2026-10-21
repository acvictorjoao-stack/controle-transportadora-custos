import {formatAbortReasonFromUnknown} from '@/features/master/companies/utils/database-error';

import {
  compareExecutedToExpected,
  HML_MANIFEST_DISCLAIMER,
  type HmlPhaseId,
} from './expected-plan';
import type {
  HmlExecutedTotals,
  HmlExecutionReport,
  HmlExpectedPlan,
  HmlOperationRecord,
  HmlOperationStatus,
  HmlOperationType,
  HmlPhaseSummary,
  HmlRecordKind,
} from './types';

export class HmlPhaseAbortError extends Error {
  readonly report: HmlExecutionReport;
  readonly phase: string;

  constructor(phase: string, message: string, report: HmlExecutionReport) {
    super(message);
    this.name = 'HmlPhaseAbortError';
    this.phase = phase;
    this.report = report;
  }
}

export class HmlExecutionTracker {
  private readonly operations: HmlOperationRecord[] = [];
  private readonly expectedPrimaryByPhase = new Map<string, number>();
  private expectedTotals: HmlExpectedPlan['totals'] | null = null;
  private abortedPhase: string | null = null;
  private abortReason: string | null = null;
  private readonly startedAt: string;
  private updatedAt: string;

  constructor(expectedPrimaryByPhase?: Record<string, number>) {
    this.startedAt = new Date().toISOString();
    this.updatedAt = this.startedAt;
    if (expectedPrimaryByPhase) {
      for (const [phase, count] of Object.entries(expectedPrimaryByPhase)) {
        this.expectedPrimaryByPhase.set(phase, count);
      }
    }
  }

  setExpectedPlan(plan: HmlExpectedPlan): void {
    this.expectedTotals = plan.totals;
    const primaryByPhase = new Map<string, number>();
    for (const item of plan.phases) {
      if (item.kind !== 'primary') continue;
      primaryByPhase.set(
        item.phase,
        (primaryByPhase.get(item.phase) ?? 0) + item.expectedCount,
      );
    }
    for (const [phase, count] of primaryByPhase) {
      this.expectedPrimaryByPhase.set(phase, count);
    }
  }

  setExpectedPrimary(phase: HmlPhaseId | string, count: number): void {
    this.expectedPrimaryByPhase.set(phase, count);
  }

  record(input: {
    phase: string;
    entity: string;
    key: string;
    table: string;
    kind: HmlRecordKind;
    operation: HmlOperationType;
    status: HmlOperationStatus;
    id?: string;
    relatedIds?: string[];
    expectedFinancialEntries?: number;
    error?: string;
  }): HmlOperationRecord {
    const entry: HmlOperationRecord = {
      ...input,
      at: new Date().toISOString(),
    };
    this.operations.push(entry);
    this.updatedAt = entry.at;
    return entry;
  }

  recordSuccess(input: {
    phase: string;
    entity: string;
    key: string;
    table: string;
    kind: HmlRecordKind;
    operation: HmlOperationType;
    id: string;
    relatedIds?: string[];
    expectedFinancialEntries?: number;
  }): HmlOperationRecord {
    return this.record({...input, status: 'success'});
  }

  recordFailure(input: {
    phase: string;
    entity: string;
    key: string;
    table: string;
    kind: HmlRecordKind;
    operation: HmlOperationType;
    id?: string;
    expectedFinancialEntries?: number;
    error: string;
  }): HmlOperationRecord {
    return this.record({...input, status: 'failed'});
  }

  recordIgnoredOptional(input: {
    phase: string;
    entity: string;
    key: string;
    table: string;
    kind: HmlRecordKind;
    operation: HmlOperationType;
    reason: string;
  }): HmlOperationRecord {
    return this.record({
      ...input,
      status: 'ignored_optional',
      error: input.reason,
    });
  }

  abort(phase: string, reason: string): never {
    this.abortedPhase = phase;
    this.abortReason = reason;
    this.updatedAt = new Date().toISOString();
    throw new HmlPhaseAbortError(phase, reason, this.toReport());
  }

  computeExecutedTotals(): HmlExecutedTotals {
    const success = this.operations.filter((op) => op.status === 'success');
    const financialSuccess = success.filter((op) => op.kind === 'financial_integration');
    return {
      primary: success.filter((op) => op.kind === 'primary').length,
      auxiliary: success.filter((op) => op.kind === 'auxiliary').length,
      statusUpdates: success.filter((op) => op.kind === 'status_update').length,
      financialIntegrationCalls: financialSuccess.length,
      financialEntriesCreated: financialSuccess.reduce(
        (sum, op) => sum + (op.relatedIds?.length ?? 0),
        0,
      ),
      ignoredOptional: this.operations.filter((op) => op.status === 'ignored_optional')
        .length,
    };
  }

  toReport(): HmlExecutionReport {
    const phaseNames = [
      ...new Set([
        ...this.operations.map((op) => op.phase),
        ...this.expectedPrimaryByPhase.keys(),
        ...(this.abortedPhase ? [this.abortedPhase] : []),
      ]),
    ];

    const phaseSummaries: HmlPhaseSummary[] = phaseNames.map((phase) => {
      const ops = this.operations.filter((op) => op.phase === phase);
      const financial = ops.filter((op) => op.kind === 'financial_integration');
      const financialOk = financial.filter((op) => op.status === 'success');
      return {
        phase,
        expectedPrimary: this.expectedPrimaryByPhase.get(phase) ?? 0,
        success: ops.filter((op) => op.status === 'success').length,
        failed: ops.filter((op) => op.status === 'failed').length,
        pending: ops.filter((op) => op.status === 'pending').length,
        ignoredOptional: ops.filter((op) => op.status === 'ignored_optional').length,
        financialSuccess: financialOk.length,
        financialFailed: financial.filter((op) => op.status === 'failed').length,
        financialEntriesCreated: financialOk.reduce(
          (sum, op) => sum + (op.relatedIds?.length ?? 0),
          0,
        ),
      };
    });

    const executedTotals = this.computeExecutedTotals();
    const financialOps = this.operations.filter(
      (op) => op.kind === 'financial_integration',
    );

    const comparison = this.expectedTotals
      ? compareExecutedToExpected(
          this.expectedTotals,
          executedTotals,
          this.abortedPhase,
        )
      : null;

    return {
      isTransactional: false,
      disclaimer: HML_MANIFEST_DISCLAIMER,
      startedAt: this.startedAt,
      updatedAt: this.updatedAt,
      abortedPhase: this.abortedPhase,
      abortReason: this.abortReason,
      operations: [...this.operations],
      phaseSummaries,
      expectedTotals: this.expectedTotals,
      executedTotals,
      comparison,
      financial: {
        integrationCallsSuccess: financialOps.filter((op) => op.status === 'success')
          .length,
        integrationCallsFailed: financialOps.filter((op) => op.status === 'failed')
          .length,
        entriesCreated: executedTotals.financialEntriesCreated,
      },
    };
  }
}

export function formatPhaseAbortMessage(report: HmlExecutionReport): string {
  const phase = report.abortedPhase ?? 'desconhecida';
  const reason = report.abortReason ?? 'falha não especificada';
  const summary = report.phaseSummaries
    .map(
      (item) =>
        `${item.phase}: ok=${item.success} fail=${item.failed} finCalls=${item.financialSuccess} finEntries=${item.financialEntriesCreated}`,
    )
    .join('; ');
  const divergence =
    report.comparison && !report.comparison.ok
      ? ` Divergências: ${report.comparison.divergences
          .map((d) => `${d.metric}(exp=${d.expected},got=${d.executed})`)
          .join(', ')}.`
      : '';
  return (
    `Carga HML interrompida na fase "${phase}": ${reason}. ` +
    `Resumo por fase: [${summary}].${divergence} ` +
    'Manifesto local não é log transacional; revise dados já gravados antes de qualquer recuperação manual.'
  );
}

/**
 * Aborta com a fase corrente explícita — nunca deduz pelo último item do plano esperado.
 */
export function throwUnexpectedPhaseAbort(
  currentPhase: string,
  error: unknown,
  tracker: HmlExecutionTracker,
): never {
  const abortReason = formatAbortReasonFromUnknown(error);
  const report = tracker.toReport();
  throw new HmlPhaseAbortError(
    currentPhase,
    formatPhaseAbortMessage({
      ...report,
      abortedPhase: currentPhase,
      abortReason,
    }),
    {
      ...report,
      abortedPhase: currentPhase,
      abortReason,
    },
  );
}
