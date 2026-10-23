import type {HmlRecoveryTable} from './constants';
import {HML_RECOVERY_CHECKPOINT_VERSION} from './constants';

export type HmlRecoveryRowState = 'ACTIVE' | 'SOFT_DELETED' | 'INVALID';

export type HmlRecoveryAction = 'would_update' | 'updated' | 'skipped' | 'blocked';

export type ManifestEntry = {
  entity: string;
  key: string;
  id: string;
  phase: string;
  table: string;
  kind: string;
  operation: string;
  createdAt: string;
};

export type ManifestFile = {
  companyId: string;
  companySlug: string;
  entries: ManifestEntry[];
};

export type PlanRow = {
  table: HmlRecoveryTable;
  key: string;
  id: string;
  idPrefix: string;
};

export type SoftPayload = Record<string, string | boolean | null>;

export type LiveRowSnapshot = {
  id: string;
  company_id: string;
  deleted_at: string | null;
  is_headquarters?: boolean | null;
  is_system?: boolean | null;
  status?: string | null;
  active?: boolean | null;
  contract_status?: string | null;
};

export type ClassifiedRow = {
  plan: PlanRow;
  state: HmlRecoveryRowState;
  reason: string;
  live: LiveRowSnapshot | null;
};

export type LinkCheckResult = {
  table: HmlRecoveryTable;
  id: string;
  key: string;
  blocked: boolean;
  reason: string;
  details: string[];
};

export type CheckpointRecord = {
  v: typeof HML_RECOVERY_CHECKPOINT_VERSION;
  at: string;
  table: HmlRecoveryTable;
  key: string;
  id: string;
  seq: number;
  state: HmlRecoveryRowState;
  action: 'updated' | 'skipped';
};

export type RecoveryDecision = {
  plan: PlanRow;
  state: HmlRecoveryRowState;
  action: HmlRecoveryAction;
  reason: string;
};
