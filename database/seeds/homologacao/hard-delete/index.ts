export {
  HML_HARD_DELETE_ALLOWED_TABLES,
  HML_HARD_DELETE_AUDIT_TABLE,
  HML_HARD_DELETE_AUTHORIZE_FLAG,
  HML_HARD_DELETE_CASCADE_CHILD_CHECKS,
  HML_HARD_DELETE_COMPANY_ID,
  HML_HARD_DELETE_COMPANY_SLUG,
  HML_HARD_DELETE_CONFIRM_ENV,
  HML_HARD_DELETE_CONFIRM_VALUE,
  HML_HARD_DELETE_CUSTOMER_BRANCH_REF_TABLES,
  HML_HARD_DELETE_EXPECTED_CODES,
  HML_HARD_DELETE_EXPECTED_ENTRY_COUNT,
  HML_HARD_DELETE_EXTERNAL_REF_CHECKS,
  HML_HARD_DELETE_EXTERNAL_REF_SCOPE,
  HML_HARD_DELETE_MANIFEST_PATH,
  HML_HARD_DELETE_MIGRATION_PATH,
  HML_HARD_DELETE_ADVISORY_LOCK_SQL,
  HML_HARD_DELETE_PORTAL_MASTER_AUTHORIZED,
  HML_HARD_DELETE_PROJECT_REF,
  HML_HARD_DELETE_PROJECT_REF_GUC,
  HML_HARD_DELETE_REMOTE_EXECUTION_ENABLED,
  HML_HARD_DELETE_RPC,
  HML_HARD_DELETE_SESSION_GUC,
  HML_HARD_DELETE_TABLE_ORDER,
} from './constants';
export type {HmlHardDeleteTable} from './constants';

export {
  allExpectedIds,
  expectedIdsByTable,
  HML_HARD_DELETE_EXPECTED_ENTRIES,
} from './expected-ids';
export type {ExpectedManifestEntry} from './expected-ids';

export {
  decideHardDeleteAuthorization,
  projectRefFromSupabaseUrl,
} from './authorization';
export type {AuthzDecision, AuthzInput, HardDeleteEnv} from './authorization';

export {
  cascadeParentIdsFromAllowlist,
  isHardDeleteAllowlistTable,
  validateCascadeChildren,
} from './cascade-validate';
export type {
  CascadeChildRow,
  CascadeValidationResult,
} from './cascade-validate';

export {
  assertManifestMatchesExpectedAllowlist,
  extractUuidsFromSql,
  loadHardDeleteManifest,
  planInDeleteOrder,
} from './manifest-validate';

export {
  filterDiscoverableCustomerHistory,
  filterDiscoverableVehicleHistory,
  validateCustomerHistoryRows,
  validateHistoryBundle,
  validateVehicleHistoryRows,
} from './history-validate';

export {
  assertNoExtraLiveRows,
  buildExpectedLookup,
  classifyTargetPresence,
  validateLiveTargetRow,
} from './row-validate';

export {
  createEmptySimulatedStore,
  runHardDeleteTransaction,
  seedSimulatedStoreWithManifestResidues,
} from './transaction-simulator';

export type {
  CustomerHistoryRow,
  ExternalRefHit,
  ExternalRefRow,
  HardDeleteOutcome,
  HistoryValidationResult,
  LiveTargetRow,
  ManifestEntry,
  ManifestFile,
  SimulatedAuditEvent,
  SimulatedStore,
  TargetValidationResult,
  VehicleHistoryRow,
} from './types';
