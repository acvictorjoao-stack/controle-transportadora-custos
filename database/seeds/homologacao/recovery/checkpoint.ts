import {appendFileSync, existsSync, mkdirSync, readFileSync} from 'node:fs';
import {dirname} from 'node:path';

import {
  HML_RECOVERY_ALLOWED_TABLES,
  HML_RECOVERY_CHECKPOINT_VERSION,
  type HmlRecoveryTable,
} from './constants';
import type {CheckpointRecord, ClassifiedRow, PlanRow} from './types';

export class CheckpointError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CheckpointError';
  }
}

export function parseCheckpointLine(line: string, lineNo: number): CheckpointRecord {
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    throw new CheckpointError(`checkpoint linha ${lineNo}: JSON inválido`);
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new CheckpointError(`checkpoint linha ${lineNo}: objeto esperado`);
  }
  const row = parsed as Record<string, unknown>;
  if (row.v !== HML_RECOVERY_CHECKPOINT_VERSION) {
    throw new CheckpointError(
      `checkpoint linha ${lineNo}: versão incompatível (esperado ${HML_RECOVERY_CHECKPOINT_VERSION})`,
    );
  }
  if (typeof row.at !== 'string' || !row.at) {
    throw new CheckpointError(`checkpoint linha ${lineNo}: at inválido`);
  }
  if (typeof row.table !== 'string' || !HML_RECOVERY_ALLOWED_TABLES.has(row.table)) {
    throw new CheckpointError(`checkpoint linha ${lineNo}: table inválida`);
  }
  if (typeof row.key !== 'string' || !row.key) {
    throw new CheckpointError(`checkpoint linha ${lineNo}: key inválida`);
  }
  if (typeof row.id !== 'string' || row.id.length < 32) {
    throw new CheckpointError(`checkpoint linha ${lineNo}: id inválido`);
  }
  if (typeof row.seq !== 'number' || !Number.isInteger(row.seq) || row.seq < 1) {
    throw new CheckpointError(`checkpoint linha ${lineNo}: seq inválido`);
  }
  // Checkpoint só registra pós-sucesso: estado observado = SOFT_DELETED.
  if (row.state !== 'SOFT_DELETED') {
    throw new CheckpointError(`checkpoint linha ${lineNo}: state inválido`);
  }
  if (row.action !== 'updated' && row.action !== 'skipped') {
    throw new CheckpointError(`checkpoint linha ${lineNo}: action inválida`);
  }

  return {
    v: HML_RECOVERY_CHECKPOINT_VERSION,
    at: row.at,
    table: row.table as HmlRecoveryTable,
    key: row.key,
    id: row.id,
    seq: row.seq,
    state: 'SOFT_DELETED',
    action: row.action,
  };
}

export function loadCheckpoint(path: string): CheckpointRecord[] {
  if (!existsSync(path)) return [];
  const content = readFileSync(path, 'utf8');
  if (!content.trim()) return [];

  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  return lines.map((line, index) => parseCheckpointLine(line, index + 1));
}

export type CheckpointLoadOutcome =
  | {status: 'ok'; records: CheckpointRecord[]}
  | {status: 'invalid'; error: string; records: []};

/**
 * Carrega checkpoint sem throw. O caller aplica política por modo:
 * - DRY_RUN: pode continuar com aviso
 * - EXECUTE: deve abortar se status === 'invalid'
 *
 * Registros nunca autorizam UPDATE/SKIP — só auditoria local.
 */
export function loadCheckpointForMode(path: string): CheckpointLoadOutcome {
  try {
    return {status: 'ok', records: loadCheckpoint(path)};
  } catch (error) {
    const message = error instanceof CheckpointError ? error.message : String(error);
    return {status: 'invalid', error: message, records: []};
  }
}

export type CheckpointConsistencyReport = {
  outsidePlan: Array<{table: string; key: string; id: string}>;
  /** Checkpoint diz SOFT_DELETED mas live ainda ACTIVE (ou INVALID). */
  liveDivergence: Array<{table: string; key: string; id: string; liveState: string}>;
};

/**
 * Analisa inconsistências do checkpoint vs plano/live.
 * Resultado é somente diagnóstico — não altera decisões de escrita.
 */
export function analyzeCheckpointConsistency(
  records: CheckpointRecord[],
  plan: PlanRow[],
  classified: ClassifiedRow[],
): CheckpointConsistencyReport {
  const planKeys = new Set(plan.map((row) => `${row.table}:${row.id}`));
  const liveByKey = new Map<string, ClassifiedRow>(
    classified.map((row) => [`${row.plan.table}:${row.plan.id}`, row]),
  );

  const outsidePlan: CheckpointConsistencyReport['outsidePlan'] = [];
  const liveDivergence: CheckpointConsistencyReport['liveDivergence'] = [];

  for (const record of records) {
    const key = `${record.table}:${record.id}`;
    if (!planKeys.has(key)) {
      outsidePlan.push({table: record.table, key: record.key, id: record.id});
      continue;
    }
    const live = liveByKey.get(key);
    if (!live) continue;
    if (live.state !== 'SOFT_DELETED') {
      liveDivergence.push({
        table: record.table,
        key: record.key,
        id: record.id,
        liveState: live.state,
      });
    }
  }

  return {outsidePlan, liveDivergence};
}

export function appendCheckpoint(path: string, record: CheckpointRecord): void {
  if (record.v !== HML_RECOVERY_CHECKPOINT_VERSION) {
    throw new CheckpointError('recusa gravar checkpoint com versão incompatível');
  }
  mkdirSync(dirname(path), {recursive: true});
  appendFileSync(path, `${JSON.stringify(record)}\n`, 'utf8');
}

export function buildCheckpointRecord(input: {
  at: string;
  table: HmlRecoveryTable;
  key: string;
  id: string;
  seq: number;
  action: 'updated' | 'skipped';
}): CheckpointRecord {
  return {
    v: HML_RECOVERY_CHECKPOINT_VERSION,
    at: input.at,
    table: input.table,
    key: input.key,
    id: input.id,
    seq: input.seq,
    state: 'SOFT_DELETED',
    action: input.action,
  };
}
