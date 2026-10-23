export {
  HML_AUTHORIZED_COMPANY_ID,
  HML_AUTHORIZED_PROJECT_REF,
  HML_COMPANY_SLUG,
  HML_COUNTS,
  HML_DESTRUCTIVE_ADVISORY_LOCK_SQL,
  HML_EXPECTED_PROJECT_REF_GUC,
  HML_REQUIRED_PLAN_SLUG,
} from './constants';
export {
  assertHmlAuthorizedProjectRef,
  assertHmlProjectRefFromEnv,
  inspectHmlEnvUrlProjectRef,
  projectRefFromSupabaseUrl,
} from './env';
export type {HmlEnvUrlProjectRefInspection} from './env';
export {getHmlCatalogCounts} from './catalog';
export {
  buildHmlExpectedPlan,
  compareExecutedToExpected,
  expectedInstallmentsFromPayment,
  HML_MANIFEST_DISCLAIMER,
  HML_SUCCESS_CRITERIA,
  countExpectedFuelFinancialEntries,
  countExpectedMaintenanceFinancialEntries,
  countExpectedTireFinancialEntries,
  countExpectedTripFreightFinancialEntries,
  countExpectedPayrollFinancialEntries,
  countExpectedFinancialIntegrationCalls,
  countExpectedFinancialEntriesCreated,
} from './expected-plan';
export {HmlExecutionTracker, HmlPhaseAbortError} from './execution-report';
export {runHomologacaoSeed} from './run';
export type {
  HmlExecutionReport,
  HmlExpectedPlan,
  HmlSeedMode,
  HmlSeedOptions,
  HmlSeedResult,
} from './types';
export {
  assertHmlCatalogInvariants,
  assertHmlZodPayloads,
  buildOfflinePlanSummary,
} from './validators';
