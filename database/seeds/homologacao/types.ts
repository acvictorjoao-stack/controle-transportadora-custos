import type {HML_EMPTY_MODULE_TABLES} from './constants';

export type HmlSeedMode = 'dry-run' | 'execute';

export interface HmlSeedOptions {
  mode: HmlSeedMode;
  /** Quando true (só dry-run), tenta autenticar e rodar guards de leitura. */
  liveChecks?: boolean;
}

export interface HmlSeedContext {
  companyId: string;
  profileId: string;
  companySlug: string;
  planSlug: string;
  hqBranchId: string;
  maxVehicles: number;
  maxUsers: number;
  maxBranches: number;
}

export interface HmlModuleCount {
  table: (typeof HML_EMPTY_MODULE_TABLES)[number] | 'branches' | 'company_members';
  count: number;
  allowed: number;
}

export interface HmlSeedPlanSummary {
  mode: HmlSeedMode;
  companySlug: string;
  requiredPlan: string;
  counts: Record<string, number>;
  modules: string[];
  /** Contagens esperadas separando principal / auxiliar / status / sync / FE. */
  expectedPlan?: HmlExpectedPlan;
}

export type HmlRecordKind =
  | 'primary'
  | 'auxiliary'
  | 'status_update'
  | 'financial_integration';

export type HmlOperationType = 'insert' | 'update' | 'sync';

export type HmlOperationStatus = 'success' | 'failed' | 'pending' | 'ignored_optional';

export interface HmlOperationRecord {
  phase: string;
  entity: string;
  key: string;
  table: string;
  kind: HmlRecordKind;
  operation: HmlOperationType;
  status: HmlOperationStatus;
  /** ID retornado pela operação (nunca credenciais). */
  id?: string;
  /** IDs de lançamentos financeiros persistidos (parcelas). */
  relatedIds?: string[];
  /** Quantidade de FE esperada pela regra de negócio nesta sync. */
  expectedFinancialEntries?: number;
  error?: string;
  at: string;
}

export interface HmlPhaseSummary {
  phase: string;
  expectedPrimary: number;
  success: number;
  failed: number;
  pending: number;
  ignoredOptional: number;
  financialSuccess: number;
  financialFailed: number;
  financialEntriesCreated: number;
}

export interface HmlExecutedTotals {
  primary: number;
  auxiliary: number;
  statusUpdates: number;
  financialIntegrationCalls: number;
  financialEntriesCreated: number;
  ignoredOptional: number;
}

export interface HmlExecutionReport {
  /**
   * O manifesto/relatório local NÃO é um log transacional do banco.
   * Cada create* comita isoladamente via PostgREST; não há rollback global.
   */
  isTransactional: false;
  disclaimer: string;
  startedAt: string;
  updatedAt: string;
  abortedPhase: string | null;
  abortReason: string | null;
  operations: HmlOperationRecord[];
  phaseSummaries: HmlPhaseSummary[];
  expectedTotals: HmlExpectedPlan['totals'] | null;
  executedTotals: HmlExecutedTotals;
  comparison: {
    ok: boolean;
    divergences: Array<{
      metric: string;
      expected: number;
      executed: number;
      delta: number;
    }>;
  } | null;
  financial: {
    /** Chamadas de integração (sync asserts) com sucesso. */
    integrationCallsSuccess: number;
    integrationCallsFailed: number;
    /** Soma de parcelas FE persistidas nas syncs bem-sucedidas. */
    entriesCreated: number;
  };
}

export interface HmlSuccessCriteria {
  comparePrimary: boolean;
  compareAuxiliary: boolean;
  compareStatusUpdates: boolean;
  compareFinancialIntegrationCalls: boolean;
  compareFinancialEntriesCreated: boolean;
  requireZeroIgnoredOptional: boolean;
  requireNoAbort: boolean;
}

export interface HmlExpectedPlan {
  disclaimer: string;
  successCriteria: HmlSuccessCriteria;
  phases: Array<{
    phase: string;
    table: string;
    kind: HmlRecordKind;
    operation: HmlOperationType;
    expectedCount: number;
    metric:
      | 'primary'
      | 'auxiliary'
      | 'status_update'
      | 'financial_integration_call'
      | 'financial_entry';
  }>;
  totals: {
    primary: number;
    auxiliary: number;
    statusUpdates: number;
    /** Chamadas de sync/assert (1 por registro operacional). */
    financialIntegrationCalls: number;
    /** Linhas em financial_entries geradas pelas integrações (parcelas). */
    financialEntriesCreated: number;
    /** primary + auxiliary + status + financialIntegrationCalls. */
    manifestTracked: number;
  };
}

export interface HmlSeedResult {
  mode: HmlSeedMode;
  aborted: boolean;
  reason?: string;
  plan: HmlSeedPlanSummary;
  liveChecksPerformed: boolean;
  context?: Pick<HmlSeedContext, 'companyId' | 'companySlug' | 'planSlug'>;
  created?: Record<string, number>;
  executionReport?: HmlExecutionReport;
}

export interface HmlManifestEntry {
  entity: string;
  key: string;
  id: string;
  createdAt: string;
  phase?: string;
  table?: string;
  kind?: HmlRecordKind;
  operation?: HmlOperationType;
  /** IDs de parcelas FE quando kind=financial_integration (sem duplicar linhas). */
  relatedIds?: string[];
  expectedFinancialEntries?: number;
}

export interface HmlManifest {
  companyId: string;
  companySlug: string;
  startedAt: string;
  updatedAt: string;
  /**
   * Aviso persistido no arquivo: este manifesto local não equivale a um
   * log transacional do banco e não habilita rollback automático.
   */
  disclaimer: string;
  isTransactional: false;
  entries: HmlManifestEntry[];
}
