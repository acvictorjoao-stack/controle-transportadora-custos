import type {HmlHardDeleteTable} from './constants';
import type {CascadeChildRow} from './cascade-validate';

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

export type LiveTargetRow = {
  id: string;
  company_id: string;
  deleted_at?: string | null;
  code?: string | null;
  is_headquarters?: boolean | null;
  is_system?: boolean | null;
};

export type CustomerHistoryRow = {
  id: string;
  company_id: string;
  customer_id: string;
  contract_id: string | null;
};

export type VehicleHistoryRow = {
  id: string;
  company_id: string;
  vehicle_id: string;
};

export type HistoryValidationResult =
  | {
      ok: true;
      customerHistoryIds: string[];
      vehicleHistoryIds: string[];
    }
  | {ok: false; reason: string};

export type TargetValidationResult =
  | {ok: true; presentCount: number; absentCount: number}
  | {ok: false; reason: string};

export type ExternalRefHit = {
  parentTable: HmlHardDeleteTable;
  parentIdPrefix: string;
  refTable: string;
  column: string;
  count: number;
  /** Soft-deleted / archived rows still count (FK ignores deleted_at). */
  includesArchived?: boolean;
};

/** Linha de FK referenciando um alvo — escopo global (H2), incl. outra empresa. */
export type ExternalRefRow = {
  table: string;
  column: string;
  parentId: string;
  childId: string;
  /** Empresa da linha referenciadora (pode diferir da HML). */
  companyId?: string;
};

export type HardDeleteOutcome =
  | {status: 'already_clean'; deleted: Record<string, number>; audited: boolean}
  | {status: 'deleted'; deleted: Record<string, number>; audited: boolean}
  | {status: 'aborted'; reason: string};

export type SimulatedAuditEvent = {
  companyId: string;
  actorId: string;
  scope: string;
  result: string;
  counts: Record<string, number>;
};

export type SimulatedStore = {
  companyId: string;
  targets: Map<string, LiveTargetRow & {table: HmlHardDeleteTable}>;
  customerHistory: CustomerHistoryRow[];
  vehicleHistory: VehicleHistoryRow[];
  /** Filhos CASCADE inventariados (documentos / extras). */
  cascadeChildren: CascadeChildRow[];
  /**
   * Refs linha a linha (preferencial). Contagem aplica excludeIds como no SQL.
   * Escopo global — companyId pode ser outra empresa (H2).
   */
  externalRefRows: ExternalRefRow[];
  /**
   * Fallback legado: `${table}:${column}:${parentId}` → count já líquido.
   * Preferir externalRefRows nos testes novos.
   */
  externalRefs: Map<string, number>;
  auditEvents: SimulatedAuditEvent[];
  /** Quando true, o INSERT de auditoria falha e a tx faz rollback. */
  auditInsertFails: boolean;
  /** Após FOR UPDATE simulado dos alvos presentes. */
  rowLocksHeld: boolean;
  hqBranchId: string;
  systemCostCenterIds: string[];
  systemPositionIds: string[];
  lockedBy: string | null;
};
