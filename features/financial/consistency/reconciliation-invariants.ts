/**
 * Fase 2.1 — As invariantes da Fase 1 no contrato da reconciliação.
 *
 * Não recria regra: recebe o resultado das funções de `fase1-consistency.ts`
 * e `trip-summary.ts` e devolve achados no mesmo formato da função do banco,
 * para o script de linha de comando e as comparações de relatório.
 */

import type {InvariantResult} from './fase1-consistency';
import {
  getReconciliationCheck,
  type ReconciliationCheckId,
  type ReconciliationEntityType,
  type ReconciliationFinding,
  ReconciliationContractError,
} from './reconciliation';

const UUID_IN_TEXT = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

interface Target {
  checkId: ReconciliationCheckId;
  entityType: ReconciliationEntityType;
  entityId: string | null;
  details?: Record<string, unknown>;
}

function uuids(text: string): string[] {
  return text.match(UUID_IN_TEXT) ?? [];
}

/** I5: "<tipo> <chave>: id1, id2". O achado aponta para o primeiro lançamento repetido. */
function duplicateTarget(violation: string): Target {
  const separator = violation.lastIndexOf(': ');
  const entryIds = separator >= 0 ? uuids(violation.slice(separator + 2)) : [];
  return {
    checkId: 'R01',
    entityType: 'financial_entry',
    entityId: entryIds[0] ?? null,
    details: {entry_ids: entryIds},
  };
}

/**
 * I3/I4 (strings de `checkTripExpenseEntryParity`):
 * "lançamento órfão da despesa <id>" → R04; "despesa <id>: N lançamento(s)" →
 * R03 (0) ou R01 (>1); valor ou viagem divergente → R05.
 */
function tripExpenseTarget(violation: string): Target {
  const [expenseId = null] = uuids(violation);
  if (violation.startsWith('lançamento órfão')) {
    return {checkId: 'R04', entityType: 'trip_expense', entityId: expenseId};
  }
  const posted = /: (\d+) lançamento\(s\)$/.exec(violation);
  if (posted) {
    return {
      checkId: Number(posted[1]) === 0 ? 'R03' : 'R01',
      entityType: 'trip_expense',
      entityId: expenseId,
      details: {posted_entries: Number(posted[1])},
    };
  }
  return {checkId: 'R05', entityType: 'trip_expense', entityId: expenseId};
}

function entryTarget(checkId: ReconciliationCheckId, violation: string): Target {
  return {checkId, entityType: 'financial_entry', entityId: uuids(violation)[0] ?? null};
}

/** I1/I3b: "<número ou id da viagem>: …". */
function tripTarget(violation: string): Target {
  return {checkId: 'R12', entityType: 'trip', entityId: uuids(violation)[0] ?? null};
}

function targetFor(invariantId: string, violation: string): Target {
  switch (invariantId) {
    case 'I5':
      return duplicateTarget(violation);
    case 'I3/I4':
      return tripExpenseTarget(violation);
    case 'I6':
      return entryTarget('R09', violation);
    case 'I8':
      return entryTarget('R07', violation);
    case 'I9':
      return entryTarget('R12', violation);
    case 'I1':
    case 'I3b':
      return tripTarget(violation);
    default:
      throw new ReconciliationContractError(`invariante sem verificação no catálogo: ${invariantId}`);
  }
}

export function invariantToFindings(result: InvariantResult): ReconciliationFinding[] {
  return result.violations.map((violation) => {
    const target = targetFor(result.id, violation);
    const check = getReconciliationCheck(target.checkId);
    return {
      checkId: check.id,
      severity: check.severity,
      category: check.category,
      entityType: target.entityType,
      entityId: target.entityId,
      reference: violation,
      expected: null,
      actual: null,
      details: {invariant: result.id, ...target.details},
      legacy: check.legacy,
    };
  });
}

export function invariantsToFindings(results: readonly InvariantResult[]): ReconciliationFinding[] {
  return results.flatMap(invariantToFindings);
}
