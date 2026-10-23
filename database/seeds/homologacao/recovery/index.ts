export {
  HML_RECOVERY_AUTHORIZE_FLAG,
  HML_RECOVERY_CHECKPOINT_PATH,
  HML_RECOVERY_CHECKPOINT_VERSION,
  HML_RECOVERY_CONFIRM_ENV,
  HML_RECOVERY_CONFIRM_VALUE,
  HML_RECOVERY_EXPECTED_ENTRY_COUNT,
  HML_RECOVERY_LINK_COVERAGE_NOTES,
  HML_RECOVERY_MANIFEST_PATH,
  HML_RECOVERY_TABLE_ORDER,
} from './constants';
export {
  analyzeCheckpointConsistency,
  appendCheckpoint,
  buildCheckpointRecord,
  CheckpointError,
  loadCheckpoint,
  loadCheckpointForMode,
  parseCheckpointLine,
  type CheckpointConsistencyReport,
  type CheckpointLoadOutcome,
} from './checkpoint';
export {
  classifyLiveRow,
  softDeleteFieldsCoherent,
  softPayloadFor,
} from './classify';
export {
  assertIdInPlan,
  buildRecoveryPlan,
  loadRecoveryManifest,
  planIdsByTable,
} from './manifest';
export {
  BRANCH_REF_TABLES,
  checkBranchLinks,
  checkCostCenterLinks,
  checkPositionLinks,
  checkSupplierLinks,
  computeRemainingAfterExclude,
  createSupabaseCountActive,
  runLinkPrechecks,
  type CountActiveFn,
} from './links';
export {classifyPlanAgainstLive, softDeleteActiveRow} from './live';
export {activePlanRows, decideRecoveryActions, summarizeDecisions} from './plan';
export type {
  CheckpointRecord,
  ClassifiedRow,
  HmlRecoveryRowState,
  LinkCheckResult,
  LiveRowSnapshot,
  ManifestFile,
  PlanRow,
  RecoveryDecision,
} from './types';
